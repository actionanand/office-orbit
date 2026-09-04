import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar } from '@ionic/angular';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';
import { PlatformService } from '../../core/platform/platform.service';
import { AuthService } from '../../core/auth/auth.service';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { BiometricService } from '../../core/platform/biometric.service';
import { environment } from '../../../environments/environment';
@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule, NgOptimizedImage, IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar],
  template: ` <ion-header class="ion-no-border"
      ><ion-toolbar><ion-title>Settings</ion-title></ion-toolbar></ion-header
    ><ion-content
      ><main class="page-wrap settings">
        <header class="page-heading">
          <p class="eyebrow">Make it yours</p>
          <h1>Settings</h1>
          <p>A calmer workspace, on your terms.</p>
        </header>
        <section class="data-card">
          <h2>Appearance</h2>
          <p>Choose how Office Orbit looks on this device.</p>
          <div class="theme-options" role="group" aria-label="Theme">
            @for (option of themes; track option.value) {
              <button
                [class.selected]="theme.mode() === option.value"
                [attr.aria-pressed]="theme.mode() === option.value"
                (click)="theme.set(option.value)">
                {{ option.label }}
              </button>
            }
          </div>
        </section>
        <section class="data-card">
          <h2>Security</h2>
          @if (platform.android) {
            <p>
              {{ lock.enabled() ? 'PIN protection is on.' : 'Add a PIN to lock this app on launch and resume.' }}
            </p>
            <p class="muted">Your local PIN never replaces your Worker password or extends your session.</p>
            <form [formGroup]="form" (ngSubmit)="savePin()">
              @if (lock.enabled()) {
                <ion-input
                  label="Current PIN"
                  labelPlacement="stacked"
                  fill="outline"
                  type="password"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="off"
                  formControlName="current" />
              }
              <ion-input
                [label]="lock.enabled() ? 'New PIN (4–6 digits)' : 'PIN (4–6 digits)'"
                labelPlacement="stacked"
                fill="outline"
                type="password"
                inputmode="numeric"
                maxlength="6"
                autocomplete="off"
                formControlName="pin" /><ion-input
                label="Confirm PIN"
                labelPlacement="stacked"
                fill="outline"
                type="password"
                inputmode="numeric"
                maxlength="6"
                autocomplete="off"
                formControlName="confirm" />
              <div class="button-row">
                <ion-button type="submit" [disabled]="busy()">{{
                  lock.enabled() ? 'Change PIN' : 'Enable PIN'
                }}</ion-button>
                @if (lock.enabled()) {
                  <ion-button type="button" fill="outline" [disabled]="busy()" (click)="disable()"
                    >Disable PIN</ion-button
                  >
                }
              </div>
              @if (lock.enabled() && (biometric.available() || lock.biometricEnabled())) {
                <ion-button type="button" fill="outline" [disabled]="busy()" (click)="toggleBiometric()">{{
                  lock.biometricEnabled() ? 'Disable biometric unlock' : 'Use biometric unlock'
                }}</ion-button>
                <p class="muted">Enter your current PIN above to change biometric access.</p>
              }
            </form>
          } @else {
            <p>PIN and biometric app lock are available in the Android app.</p>
            <p class="muted">Web sessions are stored for this browser session only.</p>
          }
          @if (message()) {
            <p class="message" role="status">{{ message() }}</p>
          }
        </section>
        <section class="data-card">
          <h2>Session</h2>
          <p>Sessions expire after approximately one hour. Sign in again using your Worker password when prompted.</p>
          <ion-button fill="outline" (click)="auth.signOut()">Sign out</ion-button>
        </section>
        <section class="data-card">
          <div class="brand-row">
            <img ngSrc="assets/office-orbit.png" width="52" height="52" alt="Office Orbit logo" />
            <h2>Office Orbit</h2>
          </div>
          <p>Your personal work-management workspace.</p>
          <dl>
            <div>
              <dt>Platform</dt>
              <dd>{{ platform.label }}</dd>
            </div>
            <div>
              <dt>API environment</dt>
              <dd>{{ api }}</dd>
            </div>
          </dl>
        </section>
      </main></ion-content
    >`,
})
export class SettingsPage {
  readonly theme = inject(ThemeService);
  readonly platform = inject(PlatformService);
  readonly auth = inject(AuthService);
  readonly lock = inject(AppLockService);
  readonly biometric = inject(BiometricService);
  readonly api = environment.apiBaseUrl;
  readonly themes: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Automatic' },
  ];
  readonly busy = signal(false);
  readonly message = signal('');
  readonly form = new FormGroup({
    current: new FormControl('', { nonNullable: true }),
    pin: new FormControl('', { nonNullable: true }),
    confirm: new FormControl('', { nonNullable: true }),
  });
  async savePin() {
    const { pin, confirm, current } = this.form.getRawValue();
    if (pin !== confirm) {
      this.message.set('PINs must match.');
      return;
    }
    await this.perform(() => this.lock.setPin(pin, current), 'PIN protection updated.');
  }
  async disable() {
    await this.perform(
      () => this.lock.disable(this.form.controls.current.value),
      'PIN and biometric protection disabled.',
    );
  }
  async toggleBiometric() {
    await this.perform(
      () => this.lock.setBiometric(!this.lock.biometricEnabled(), this.form.controls.current.value),
      'Biometric preference updated.',
    );
  }
  private async perform(action: () => Promise<void>, success: string) {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await action();
      this.form.reset();
      this.message.set(success);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to update security settings.');
    } finally {
      this.busy.set(false);
    }
  }
}
