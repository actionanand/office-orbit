import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { IonButton, IonContent, IonHeader, IonInput, IonTitle, IonToolbar } from '@ionic/angular';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';
import { PlatformService } from '../../core/platform/platform.service';
import { AuthService } from '../../core/auth/auth.service';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { BiometricService } from '../../core/platform/biometric.service';
import { appVersion } from '../../core/version/app-version';
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
            <p class="muted">Your PIN protects this device. It does not extend your signed-in session.</p>
            @if (!lock.enabled()) {
              <form [formGroup]="form" (ngSubmit)="savePin()">
                <ion-input
                  label="PIN (4–6 digits)"
                  labelPlacement="stacked"
                  fill="outline"
                  type="password"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="off"
                  formControlName="pin" />
                <ion-input
                  label="Confirm PIN"
                  labelPlacement="stacked"
                  fill="outline"
                  type="password"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="off"
                  formControlName="confirm" />
                <ion-button type="submit" [disabled]="busy()">Enable PIN</ion-button>
              </form>
            } @else if (securityAction() === null) {
              <div class="security-actions" role="group" aria-label="PIN and biometric settings">
                <ion-button type="button" fill="outline" (click)="chooseSecurityAction('change')"
                  >Change PIN</ion-button
                >
                @if (biometric.available() || lock.biometricEnabled()) {
                  <ion-button type="button" fill="outline" (click)="chooseSecurityAction('biometric')">{{
                    lock.biometricEnabled() ? 'Turn off biometric unlock' : 'Set up biometric unlock'
                  }}</ion-button>
                }
                <ion-button type="button" fill="outline" color="danger" (click)="chooseSecurityAction('disable')"
                  >Turn off PIN protection</ion-button
                >
              </div>
            } @else {
              <form [formGroup]="form" (ngSubmit)="submitSecurityAction()">
                <h3>
                  @switch (securityAction()) {
                    @case ('change') {
                      Change your PIN
                    }
                    @case ('disable') {
                      Turn off PIN protection
                    }
                    @case ('biometric') {
                      {{ lock.biometricEnabled() ? 'Turn off biometric unlock' : 'Set up biometric unlock' }}
                    }
                  }
                </h3>
                <p class="muted">Enter your current PIN to confirm this change.</p>
                <ion-input
                  label="Current PIN"
                  labelPlacement="stacked"
                  fill="outline"
                  type="password"
                  inputmode="numeric"
                  maxlength="6"
                  autocomplete="off"
                  formControlName="current" />
                @if (securityAction() === 'change') {
                  <ion-input
                    label="New PIN (4–6 digits)"
                    labelPlacement="stacked"
                    fill="outline"
                    type="password"
                    inputmode="numeric"
                    maxlength="6"
                    autocomplete="off"
                    formControlName="pin" />
                  <ion-input
                    label="Confirm new PIN"
                    labelPlacement="stacked"
                    fill="outline"
                    type="password"
                    inputmode="numeric"
                    maxlength="6"
                    autocomplete="off"
                    formControlName="confirm" />
                }
                @if (securityAction() === 'biometric' && !lock.biometricEnabled()) {
                  <p class="muted">Android will ask for your fingerprint or face once after your PIN is accepted.</p>
                }
                <div class="button-row">
                  <ion-button type="submit" [disabled]="busy()">Continue</ion-button>
                  <ion-button type="button" fill="clear" [disabled]="busy()" (click)="cancelSecurityAction()"
                    >Cancel</ion-button
                  >
                </div>
              </form>
            }
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
          <p><strong>Signed in</strong></p>
          <p>
            Office Orbit keeps your session active while you are working. For security, you'll be asked to sign in again
            after the maximum session period.
          </p>
          @if (sessionExpiresBy()) {
            <dl>
              <div>
                <dt>Session expires by</dt>
                <dd>{{ sessionExpiresBy() }}</dd>
              </div>
            </dl>
          }
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
              <dt>Version</dt>
              <dd>{{ version }}</dd>
            </div>
          </dl>
          <p class="muted">Your local security preferences stay on this device.</p>
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
  readonly version = appVersion;
  readonly sessionExpiresBy = computed(() => {
    const value = this.auth.state.session()?.sessionExpiresAt;
    return value ? new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(value) : '';
  });
  readonly themes: { value: ThemeMode; label: string }[] = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'Automatic' },
  ];
  readonly busy = signal(false);
  readonly message = signal('');
  readonly securityAction = signal<'change' | 'disable' | 'biometric' | null>(null);
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
  chooseSecurityAction(action: 'change' | 'disable' | 'biometric'): void {
    this.form.reset();
    this.message.set('');
    this.securityAction.set(action);
  }
  cancelSecurityAction(): void {
    this.form.reset();
    this.message.set('');
    this.securityAction.set(null);
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
  async submitSecurityAction(): Promise<void> {
    switch (this.securityAction()) {
      case 'change':
        await this.savePin();
        break;
      case 'disable':
        await this.disable();
        break;
      case 'biometric':
        await this.toggleBiometric();
        break;
    }
  }
  private async perform(action: () => Promise<void>, success: string) {
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await action();
      this.form.reset();
      this.securityAction.set(null);
      this.message.set(success);
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to update security settings.');
    } finally {
      this.busy.set(false);
    }
  }
}
