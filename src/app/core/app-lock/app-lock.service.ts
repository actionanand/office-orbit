import { computed, inject, Service, signal } from '@angular/core';
import { AuthState } from '../auth/auth-state';
import { PinStorageService } from '../storage/pin-storage.service';
import { PlatformService } from '../platform/platform.service';
import { BiometricService } from '../platform/biometric.service';
import { createPin, parsePin, PinRecord, verifyPin } from './pin';

@Service()
export class AppLockService {
  private readonly storage = inject(PinStorageService);
  private readonly platform = inject(PlatformService);
  private readonly auth = inject(AuthState);
  private readonly biometric = inject(BiometricService);
  private readonly record = signal<PinRecord | null>(null);
  readonly enabled = computed(() => this.record() !== null);
  readonly biometricEnabled = computed(() => this.record()?.biometric ?? false);
  readonly locked = signal(true);
  // Set when a stored protection record exists over a valid session but cannot be
  // read/parsed. Protected content must not render; a safe recovery is required.
  readonly recovery = signal(false);
  private checking = false;
  private lockRevision = 0;
  async initialize(): Promise<void> {
    this.recovery.set(false);
    let raw: string | null = null;
    let unreadable = false;
    try {
      raw = await this.storage.get();
    } catch {
      unreadable = true;
    }
    if (!unreadable && raw !== null) {
      try {
        this.record.set(parsePin(raw));
      } catch {
        this.record.set(null);
        unreadable = true;
      }
    } else {
      this.record.set(null);
    }
    // An unreadable record only matters when there is a session to protect. Without
    // a valid session the user simply proceeds to the Worker login screen.
    if (unreadable && this.auth.valid()) this.recovery.set(true);
    const shouldLock = this.enabled() || this.recovery();
    this.locked.set(shouldLock);
    this.auth.localLocked.set(shouldLock);
    if (this.enabled() && this.platform.android) void this.biometric.check();
  }
  // Discards a protection record that could not be read after the user has
  // re-authenticated, returning the app to a clean, unlocked state.
  async clearUnreadable(): Promise<void> {
    try {
      await this.storage.remove();
    } catch {
      /* Best-effort removal; a later successful save overwrites the value. */
    }
    this.record.set(null);
    this.recovery.set(false);
    this.locked.set(false);
    this.auth.localLocked.set(false);
  }
  lock(): void {
    this.lockRevision++;
    if (this.enabled()) {
      this.locked.set(true);
      this.auth.localLocked.set(true);
    }
  }
  unlockAfterSignIn(): void {
    this.requireSession();
    this.locked.set(false);
    this.auth.localLocked.set(false);
  }
  async resetAfterSignIn(): Promise<void> {
    this.requireSession();
    await this.storage.remove();
    this.record.set(null);
    this.locked.set(false);
    this.auth.localLocked.set(false);
  }
  private async save(record: PinRecord): Promise<void> {
    await this.storage.set(JSON.stringify(record));
    this.record.set(record);
  }
  private async confirm(pin: string): Promise<void> {
    const record = this.record();
    if (!record || this.checking) throw new Error('Please try again.');
    if (record.retryAt > Date.now())
      throw new Error(`Try again in ${Math.ceil((record.retryAt - Date.now()) / 1000)} seconds.`);
    this.checking = true;
    try {
      if (!(await verifyPin(pin, record))) {
        const failures = record.failures + 1;
        await this.save({
          ...record,
          failures,
          retryAt: failures >= 5 ? Date.now() + Math.min(300000, 30000 * 2 ** Math.min(failures - 5, 4)) : 0,
        });
        throw new Error(
          failures >= 5 ? 'Incorrect PIN. Please wait before trying again.' : 'Incorrect PIN. Try again.',
        );
      }
      await this.save({ ...record, failures: 0, retryAt: 0 });
    } finally {
      this.checking = false;
    }
  }
  private requireSession(): void {
    if (!this.auth.valid()) throw new Error('Your session has expired. Sign in again.');
  }
  async unlock(pin: string): Promise<void> {
    const revision = this.lockRevision;
    this.requireSession();
    await this.confirm(pin);
    this.requireSession();
    if (revision === this.lockRevision) {
      this.locked.set(false);
      this.auth.localLocked.set(false);
    }
  }
  async unlockBiometric(): Promise<void> {
    const revision = this.lockRevision;
    this.requireSession();
    if (!this.biometricEnabled()) throw new Error('Use your PIN to unlock.');
    await this.biometric.authenticate();
    this.requireSession();
    if (revision === this.lockRevision) {
      this.locked.set(false);
      this.auth.localLocked.set(false);
    }
  }
  async setPin(pin: string, current = ''): Promise<void> {
    const revision = this.lockRevision;
    this.requireSession();
    if (this.enabled()) await this.confirm(current);
    const record = await createPin(pin);
    this.requireSession();
    await this.save(record);
    this.locked.set(revision !== this.lockRevision);
    this.auth.localLocked.set(this.locked());
    if (this.platform.android) void this.biometric.check();
  }
  async disable(pin: string): Promise<void> {
    this.requireSession();
    await this.confirm(pin);
    this.requireSession();
    await this.storage.remove();
    this.record.set(null);
    this.locked.set(false);
    this.auth.localLocked.set(false);
  }
  async setBiometric(enabled: boolean, pin: string): Promise<void> {
    this.requireSession();
    if (!this.platform.android) throw new Error('Biometric unlock is available on Android.');
    await this.confirm(pin);
    if (enabled) await this.biometric.authenticate();
    this.requireSession();
    const record = this.record();
    if (record) await this.save({ ...record, biometric: enabled });
  }
}
