import { Component, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { IonButton, IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { eyeOffOutline, eyeOutline, keyOutline, lockClosedOutline } from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { CredentialManagerService } from '../../core/platform/credential-manager.service';
import { PlatformService } from '../../core/platform/platform.service';
import { StartupService } from '../../core/startup.service';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, NgOptimizedImage, IonButton, IonContent, IonIcon, IonInput, IonSpinner],
  template: `<ion-content
    ><main class="auth-page">
      <section class="auth-brand">
        <img ngSrc="assets/office-orbit.png" width="112" height="112" priority alt="Office Orbit logo" />
        <p class="eyebrow">Personal work intelligence</p>
        <h1>Keep your work in orbit.</h1>
        <p>A focused view of the work, progress, and moments that matter.</p>
      </section>
      <section class="auth-card" aria-labelledby="sign-in-title">
        <ion-icon name="lock-closed-outline" aria-hidden="true" />
        @if (securityChoice()) {
          <h2 id="sign-in-title">Keep device protection?</h2>
          @if (platform.android) {
            <p>
              You are signed in again. Keep your existing PIN and biometric unlock, or reset device protection and set
              it up later.
            </p>
          } @else {
            <p>You are signed in again. Keep your existing PIN protection, or reset it and set up a new PIN later.</p>
          }
          @if (message()) {
            <div class="message error" role="alert">{{ message() }}</div>
          }
          <ion-button expand="block" [disabled]="busy()" (click)="keepDeviceProtection()">{{
            platform.android ? 'Keep PIN and biometric' : 'Keep existing PIN'
          }}</ion-button>
          <ion-button expand="block" fill="outline" [disabled]="busy()" (click)="resetDeviceProtection()">{{
            platform.android ? 'Reset device protection' : 'Reset PIN protection'
          }}</ion-button>
        } @else if (startup.phase() === 'error') {
          <h2 id="sign-in-title">Welcome back</h2>
          <div class="message error" role="alert">
            We couldn’t verify your existing session. Check your connection.<ion-button fill="clear" (click)="retry()"
              >Try again</ion-button
            >
          </div>
        } @else {
          <h2 id="sign-in-title">Welcome back</h2>
          <p>Enter your credentials.</p>
          <form [formGroup]="form" autocomplete="on" (ngSubmit)="submit()">
            <ion-input
              id="office-orbit-username"
              name="username"
              label="Username"
              labelPlacement="stacked"
              fill="outline"
              type="text"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              maxlength="12"
              required
              formControlName="username"
              [errorText]="form.controls.username.touched && form.controls.username.invalid ? 'Enter username.' : ''" />
            <ion-input
              id="office-orbit-password"
              name="password"
              label="Password"
              labelPlacement="stacked"
              fill="outline"
              [type]="visible() ? 'text' : 'password'"
              autocomplete="current-password"
              required
              formControlName="password"
              [errorText]="
                form.controls.password.touched && form.controls.password.invalid ? 'Enter your password.' : ''
              "
              ><ion-button
                fill="clear"
                slot="end"
                type="button"
                [attr.aria-label]="visible() ? 'Hide password' : 'Show password'"
                (click)="togglePassword()"
                ><ion-icon [name]="visible() ? 'eye-off-outline' : 'eye-outline'" /></ion-button
            ></ion-input>
            @if (message()) {
              <div class="message error" role="alert">{{ message() }}</div>
            }
            @if (auth.state.notice()) {
              <div class="message" role="status">{{ auth.state.notice() }}</div>
            }
            @if (credentialMessage()) {
              <div class="message" role="status">{{ credentialMessage() }}</div>
            }
            <ion-button
              expand="block"
              type="submit"
              [disabled]="busy() || credentialBusy() || formStatus() !== 'VALID'">
              @if (busy()) {
                <ion-spinner name="crescent" />
              } @else {
                Sign in
              }
            </ion-button>
            @if (platform.android) {
              <ion-button
                expand="block"
                fill="clear"
                type="button"
                [disabled]="busy() || credentialBusy()"
                (click)="useSavedPassword()">
                @if (credentialBusy()) {
                  <ion-spinner name="crescent" />
                } @else {
                  <ion-icon name="key-outline" slot="start" aria-hidden="true" />
                  Use saved credentials
                }
              </ion-button>
            }
          </form>
        }
      </section>
    </main></ion-content
  >`,
})
export class LoginPage {
  readonly auth = inject(AuthService);
  readonly startup = inject(StartupService);
  readonly platform = inject(PlatformService);
  private readonly lock = inject(AppLockService);
  private readonly credentials = inject(CredentialManagerService);
  private readonly router = inject(Router);
  readonly form = new FormGroup({
    username: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.maxLength(12), Validators.pattern(/\S/)],
    }),
    password: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });
  readonly formStatus = toSignal(this.form.statusChanges, { initialValue: this.form.status });
  readonly visible = signal(false);
  readonly busy = signal(false);
  readonly credentialBusy = signal(false);
  readonly message = signal('');
  readonly credentialMessage = signal('');
  readonly securityChoice = signal(false);
  constructor() {
    addIcons({ eyeOffOutline, eyeOutline, keyOutline, lockClosedOutline });
  }
  togglePassword(): void {
    this.visible.update(value => !value);
  }
  async retry() {
    await this.startup.retry();
    if (this.startup.phase() === 'ready' && this.auth.state.valid()) {
      await this.router.navigateByUrl(this.lock.locked() ? '/unlock' : '/app/dashboard', {
        replaceUrl: true,
      });
    }
  }
  async submit() {
    if (this.busy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.busy.set(true);
    this.message.set('');
    this.credentialMessage.set('');
    try {
      const { username, password } = this.form.getRawValue();
      await this.auth.login(password);
      await this.credentials.savePassword(username, password);
      if (this.lock.enabled()) {
        this.securityChoice.set(true);
      } else {
        this.lock.unlockAfterSignIn();
        await this.router.navigateByUrl('/app/dashboard', { replaceUrl: true });
      }
    } catch (error) {
      this.message.set(
        error instanceof HttpErrorResponse
          ? apiError(error, true)
          : error instanceof Error
            ? error.message
            : apiError(error, true),
      );
      this.form.controls.password.reset();
    } finally {
      this.busy.set(false);
    }
  }

  async useSavedPassword(): Promise<void> {
    if (!this.platform.android || this.busy() || this.credentialBusy()) return;
    this.credentialBusy.set(true);
    this.message.set('');
    this.credentialMessage.set('');
    try {
      const result = await this.credentials.getPassword();
      if (result.status === 'success') {
        this.form.patchValue({ username: result.username.slice(0, 12), password: result.password });
        this.visible.set(false);
        this.credentialMessage.set('Saved password filled. Press Sign in to continue.');
      } else if (result.status === 'not-found') {
        this.credentialMessage.set('No saved Office Orbit password was found.');
      } else if (result.status === 'unavailable') {
        this.credentialMessage.set('Saved passwords are unavailable on this device.');
      } else if (result.status === 'error') {
        this.credentialMessage.set('Unable to retrieve a saved password. Please try again.');
      }
    } finally {
      this.credentialBusy.set(false);
    }
  }
  async keepDeviceProtection(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      this.lock.unlockAfterSignIn();
      await this.router.navigateByUrl('/app/dashboard', { replaceUrl: true });
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to continue. Please sign in again.');
    } finally {
      this.busy.set(false);
    }
  }
  async resetDeviceProtection(): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      await this.lock.resetAfterSignIn();
      await this.router.navigateByUrl('/app/dashboard', { replaceUrl: true });
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to reset device protection.');
    } finally {
      this.busy.set(false);
    }
  }
}
