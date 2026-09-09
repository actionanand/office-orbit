import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgOptimizedImage } from '@angular/common';
import { IonButton, IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { fingerPrintOutline, lockOpenOutline } from 'ionicons/icons';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { PlatformService } from '../../core/platform/platform.service';
@Component({
  selector: 'app-unlock',
  imports: [ReactiveFormsModule, NgOptimizedImage, IonButton, IonContent, IonIcon, IonInput, IonSpinner],
  template: `<ion-content
    ><main class="auth-page compact">
      <section class="auth-card">
        <img ngSrc="assets/office-orbit.png" width="72" height="72" priority alt="Office Orbit logo" />
        <p class="eyebrow">Local app lock</p>
        <h1>Unlock Office Orbit</h1>
        <p>Your Worker session is valid. Enter your device PIN to continue.</p>
        <form [formGroup]="form" (ngSubmit)="unlock()">
          <ion-input
            label="PIN"
            labelPlacement="stacked"
            fill="outline"
            type="password"
            inputmode="numeric"
            maxlength="6"
            autocomplete="off"
            formControlName="pin"
            errorText="Enter 4 to 6 digits." />
          @if (message()) {
            <div class="message error" role="alert">{{ message() }}</div>
          }
          <ion-button expand="block" shape="round" type="submit" [disabled]="busy()">
            @if (busy()) {
              <ion-spinner name="crescent" />
            } @else {
              <ion-icon slot="start" name="lock-open-outline" aria-hidden="true" />Unlock
            }
          </ion-button>
          @if (platform.android && lock.biometricEnabled()) {
            <ion-button expand="block" shape="round" fill="outline" type="button" (click)="bio()"
              ><ion-icon slot="start" name="finger-print-outline" />Use biometric</ion-button
            >
          }
        </form>
      </section>
    </main></ion-content
  >`,
})
export class UnlockPage {
  readonly lock = inject(AppLockService);
  readonly platform = inject(PlatformService);
  private router = inject(Router);
  readonly form = new FormGroup({
    pin: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.pattern(/^\d{4,6}$/)] }),
  });
  readonly busy = signal(false);
  readonly message = signal('');
  constructor() {
    addIcons({ fingerPrintOutline, lockOpenOutline });
  }
  async unlock() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    await this.perform(() => this.lock.unlock(this.form.controls.pin.value));
  }
  async bio() {
    await this.perform(() => this.lock.unlockBiometric());
  }
  private async perform(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      await action();
      await this.router.navigateByUrl('/app/dashboard', { replaceUrl: true });
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to unlock. Use your PIN.');
      this.form.controls.pin.reset();
    } finally {
      this.busy.set(false);
    }
  }
}
