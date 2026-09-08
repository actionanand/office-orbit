import { inject, Service } from '@angular/core';
import { PlatformService } from '../platform/platform.service';

@Service()
export class NativeStorageService {
  private readonly platform = inject(PlatformService);
  private async plugin() {
    if (!this.platform.android) throw new Error('Secure storage requires Android.');
    const { SecureStorage } = await import('@aparajita/capacitor-secure-storage');
    return SecureStorage;
  }
  async get(key: string): Promise<string | null> {
    return this.withDeadline(async () => (await this.plugin()).getItem(`office-orbit.${key}`));
  }
  async set(key: string, value: string): Promise<void> {
    await this.withDeadline(async () => (await this.plugin()).setItem(`office-orbit.${key}`, value));
  }
  async remove(key: string): Promise<void> {
    await this.withDeadline(async () => (await this.plugin()).removeItem(`office-orbit.${key}`));
  }
  private async withDeadline<T>(operation: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          // Keep two sequential startup reads plus the biometric probe within the
          // StartupService deadline so a slow Keystore cannot stall the app.
          timer = setTimeout(() => reject(new Error('Secure storage did not respond.')), 8_000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}
