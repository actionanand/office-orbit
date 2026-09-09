import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { NgOptimizedImage } from '@angular/common';
import { interval } from 'rxjs';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToggle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { contrastOutline, lockClosedOutline, logOutOutline, moonOutline, sunnyOutline } from 'ionicons/icons';
import { ThemeService, ThemeMode } from '../../core/theme/theme.service';
import { PlatformService } from '../../core/platform/platform.service';
import { AuthService } from '../../core/auth/auth.service';
import { AppLockService, LockTimeoutMinutes } from '../../core/app-lock/app-lock.service';
import { BiometricService } from '../../core/platform/biometric.service';
import { appVersion } from '../../core/version/app-version';
@Component({
  selector: 'app-settings',
  imports: [
    ReactiveFormsModule,
    NgOptimizedImage,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToggle,
    IonToolbar,
  ],
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
                [attr.aria-label]="option.label"
                (click)="theme.set(option.value)">
                <ion-icon [name]="option.icon" aria-hidden="true" /><span class="theme-option-label">{{
                  option.label
                }}</span>
              </button>
            }
          </div>
        </section>
        <section class="data-card">
          <h2>Security</h2>
          <p>
            {{
              lock.enabled()
                ? 'PIN protection is on.'
                : platform.android
                  ? 'Add a PIN to lock this app on launch and resume.'
                  : 'Add a PIN to lock this app when you reload or reopen it.'
            }}
          </p>
          <p class="muted">Your PIN protects this device. It does not extend your signed-in session.</p>
          <div class="setting-row">
            <label for="pin-protection-toggle">{{
              lock.enabled() ? 'PIN protection Enabled' : 'PIN protection Disabled'
            }}</label>
            <ion-toggle
              id="pin-protection-toggle"
              color="primary"
              [checked]="pinProtectionChecked()"
              (ionChange)="onPinProtectionToggle($event.detail.checked)" />
          </div>
          @if (securityAction() === 'enable') {
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
              <div class="button-row">
                <ion-button type="submit" [disabled]="busy()">Enable PIN</ion-button>
                <ion-button type="button" fill="clear" [disabled]="busy()" (click)="cancelSecurityAction()"
                  >Cancel</ion-button
                >
              </div>
            </form>
          } @else if (lock.enabled() && securityAction() === null) {
            <div class="security-actions" role="group" aria-label="PIN settings">
              <ion-button type="button" fill="outline" (click)="chooseSecurityAction('change')">Change PIN</ion-button>
            </div>
            @if (platform.android && (biometric.available() || lock.biometricEnabled())) {
              <div class="setting-row">
                <label for="biometric-toggle">{{
                  lock.biometricEnabled() ? 'Disable Biometric unlock' : 'Enable Biometric unlock'
                }}</label>
                <ion-toggle
                  id="biometric-toggle"
                  color="primary"
                  [checked]="biometricChecked()"
                  (ionChange)="onBiometricToggle($event.detail.checked)" />
              </div>
            }
            <div class="lock-timeout">
              <ion-select
                label="Lock automatically after inactivity"
                labelPlacement="stacked"
                fill="outline"
                interface="popover"
                [value]="lock.lockAfterMinutes()"
                (ionChange)="lock.setLockAfterMinutes($event.detail.value)">
                @for (option of lockTimeouts; track option.value) {
                  <ion-select-option [value]="option.value">{{ option.label }}</ion-select-option>
                }
              </ion-select>
              <ion-button type="button" fill="outline" (click)="lockNow()"
                ><ion-icon slot="start" name="lock-closed-outline" aria-hidden="true" />Lock now</ion-button
              >
            </div>
          } @else if (
            securityAction() === 'change' || securityAction() === 'disable' || securityAction() === 'biometric'
          ) {
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
          @if (message()) {
            <p class="message" role="status">{{ message() }}</p>
          }
        </section>
        <section class="data-card">
          <h2>Session</h2>
          <p><strong>Signed in</strong></p>
          <p>{{ sessionKind() }}</p>
          @if (auth.state.notice()) {
            <p class="message" role="status">{{ auth.state.notice() }}</p>
          }
          @if (expiresAtLabel()) {
            <dl>
              <div>
                <dt>Expires at</dt>
                <dd>{{ expiresAtDisplay() }}</dd>
              </div>
            </dl>
          }
          <div class="session-preferences">
            <div class="setting-row">
              <label for="time-format-toggle">Use 24-hour time</label>
              <ion-toggle
                id="time-format-toggle"
                [checked]="timeFormat() === '24'"
                (ionChange)="setTimeFormat($event.detail.checked ? '24' : '12')" />
            </div>
            <div class="setting-row">
              <label for="remaining-time-toggle">Show remaining time until sign-out</label>
              <ion-toggle
                id="remaining-time-toggle"
                [checked]="showRemainingTime()"
                (ionChange)="setShowRemainingTime($event.detail.checked)" />
            </div>
          </div>
          <ion-button fill="outline" (click)="auth.signOut()"
            ><ion-icon slot="start" name="log-out-outline" aria-hidden="true" />Sign out</ion-button
          >
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
  readonly sessionKind = computed(() =>
    this.auth.state.session()?.sessionKind === 'extended' ? 'Extended session' : 'Fresh session',
  );
  // Derives from securityAction() too so leaving the disable-confirmation flow
  // (cancel or a wrong PIN) is a real value change the toggle re-renders from,
  // instead of silently no-opping because lock.enabled() alone never changed.
  readonly pinProtectionChecked = computed(() => this.lock.enabled() && this.securityAction() !== 'disable');
  // Shows the optimistic target state while the confirm-PIN flow is open, and
  // the real state once it ends (cancel, failure, or success all resolve it).
  readonly biometricChecked = computed(() =>
    this.securityAction() === 'biometric' ? !this.lock.biometricEnabled() : this.lock.biometricEnabled(),
  );
  readonly timeFormat = signal<'12' | '24'>(this.loadTimeFormat());
  readonly showRemainingTime = signal(this.loadShowRemainingTime());
  // Advances the remaining-time display without depending on Date.now() directly.
  private readonly now = signal(Date.now());
  readonly expiresAtLabel = computed(() => {
    const value = this.auth.state.session()?.expiresAt;
    if (!value) return '';
    const expiry = new Date(value);
    const now = new Date();
    const sameDay =
      expiry.getFullYear() === now.getFullYear() &&
      expiry.getMonth() === now.getMonth() &&
      expiry.getDate() === now.getDate();
    return new Intl.DateTimeFormat(undefined, {
      ...(sameDay ? {} : { month: 'short' as const, day: 'numeric' as const }),
      hour: 'numeric',
      minute: '2-digit',
      hour12: this.timeFormat() === '12',
    }).format(expiry);
  });
  readonly remainingTimeLabel = computed(() => {
    const value = this.auth.state.session()?.expiresAt;
    if (!value) return '';
    this.now();
    const diff = value - Date.now();
    if (diff <= 0) return 'less than a minute left';
    const hours = Math.floor(diff / 3_600_000);
    const minutes = Math.floor((diff % 3_600_000) / 60_000);
    const parts: string[] = [];
    if (hours > 0) parts.push(`${hours} hour${hours === 1 ? '' : 's'}`);
    if (minutes > 0 || hours === 0) parts.push(`${minutes} minute${minutes === 1 ? '' : 's'}`);
    return `${parts.join(' ')} left`;
  });
  readonly expiresAtDisplay = computed(() => {
    const label = this.expiresAtLabel();
    if (!label) return '';
    return this.showRemainingTime() ? `${label} (${this.remainingTimeLabel()})` : label;
  });
  readonly themes: { value: ThemeMode; label: string; icon: string }[] = [
    { value: 'light', label: 'Light', icon: 'sunny-outline' },
    { value: 'dark', label: 'Dark', icon: 'moon-outline' },
    { value: 'system', label: 'Automatic', icon: 'contrast-outline' },
  ];
  readonly lockTimeouts: { value: LockTimeoutMinutes; label: string }[] = [
    { value: 0, label: 'Off' },
    { value: 1, label: '1 minute' },
    { value: 5, label: '5 minutes' },
    { value: 10, label: '10 minutes' },
  ];
  readonly busy = signal(false);
  readonly message = signal('');
  readonly securityAction = signal<'enable' | 'change' | 'disable' | 'biometric' | null>(null);
  readonly form = new FormGroup({
    current: new FormControl('', { nonNullable: true }),
    pin: new FormControl('', { nonNullable: true }),
    confirm: new FormControl('', { nonNullable: true }),
  });
  constructor() {
    addIcons({ contrastOutline, lockClosedOutline, logOutOutline, moonOutline, sunnyOutline });
    interval(30_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.now.set(Date.now()));
  }
  setTimeFormat(format: '12' | '24'): void {
    this.timeFormat.set(format);
    try {
      localStorage.setItem('office-orbit.time-format', format);
    } catch {
      /* Preference still applies for this session. */
    }
  }
  setShowRemainingTime(value: boolean): void {
    this.showRemainingTime.set(value);
    try {
      localStorage.setItem('office-orbit.show-remaining-time', String(value));
    } catch {
      /* Preference still applies for this session. */
    }
  }
  private loadTimeFormat(): '12' | '24' {
    try {
      const saved = localStorage.getItem('office-orbit.time-format');
      if (saved === '12' || saved === '24') return saved;
    } catch {
      /* Default to 12-hour when preferences are unavailable. */
    }
    return '12';
  }
  private loadShowRemainingTime(): boolean {
    try {
      return localStorage.getItem('office-orbit.show-remaining-time') === 'true';
    } catch {
      return false;
    }
  }
  lockNow(): void {
    this.lock.lock();
  }
  async savePin() {
    const { pin, confirm, current } = this.form.getRawValue();
    if (pin !== confirm) {
      this.message.set('PINs must match.');
      return;
    }
    await this.perform(() => this.lock.setPin(pin, current), 'PIN protection updated.');
  }
  chooseSecurityAction(action: 'enable' | 'change' | 'disable' | 'biometric'): void {
    this.form.reset();
    this.message.set('');
    this.securityAction.set(action);
  }
  // The switch reflects the confirmed state; toggling it only opens the enable
  // or disable step, so it snaps back until that step actually succeeds.
  onPinProtectionToggle(checked: boolean): void {
    if (checked && !this.lock.enabled()) this.chooseSecurityAction('enable');
    else if (!checked && this.lock.enabled()) this.chooseSecurityAction('disable');
  }
  onBiometricToggle(checked: boolean): void {
    if (checked !== this.lock.biometricEnabled()) this.chooseSecurityAction('biometric');
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
    if (this.busy()) return;
    this.busy.set(true);
    try {
      await this.lock.setBiometric(!this.lock.biometricEnabled(), this.form.controls.current.value);
      this.form.reset();
      this.securityAction.set(null);
      this.message.set('Biometric preference updated.');
    } catch (error) {
      const text = error instanceof Error ? error.message : 'Unable to update security settings.';
      this.message.set(text);
      // A failed/cancelled biometric prompt can't be fixed by retrying the PIN
      // alone, so abandon the attempt and let the toggle revert to off.
      if (text.toLowerCase().includes('biometric')) {
        this.form.reset();
        this.securityAction.set(null);
      }
    } finally {
      this.busy.set(false);
    }
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
