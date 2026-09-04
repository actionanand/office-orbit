import { inject, Service, signal } from '@angular/core';
import { PlatformService } from './platform.service';

@Service()
export class BiometricService {
  private readonly platform = inject(PlatformService);
  readonly available = signal(false);
  readonly prompting = signal(false);
  async check(): Promise<boolean> {
    if (!this.platform.android) return false;
    try {
      const { BiometricAuth } = await import('@aparajita/capacitor-biometric-auth');
      this.available.set((await BiometricAuth.checkBiometry()).strongBiometryIsAvailable);
    } catch {
      this.available.set(false);
    }
    return this.available();
  }
  async authenticate(): Promise<void> {
    if (!(await this.check())) throw new Error('Biometric unlock is unavailable. Use your PIN.');
    this.prompting.set(true);
    try {
      const { BiometricAuth, AndroidBiometryStrength } = await import('@aparajita/capacitor-biometric-auth');
      await BiometricAuth.authenticate({
        reason: 'Unlock Office Orbit',
        androidTitle: 'Office Orbit',
        allowDeviceCredential: false,
        androidBiometryStrength: AndroidBiometryStrength.strong,
      });
    } catch {
      throw new Error('Biometric verification was cancelled or unavailable. Use your PIN to continue.');
    } finally {
      this.prompting.set(false);
    }
  }
}
