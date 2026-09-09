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
    return this.withRetry(() => this.withDeadline(async () => (await this.plugin()).getItem(`office-orbit.${key}`)));
  }
  async set(key: string, value: string): Promise<void> {
    await this.withRetry(() =>
      this.withDeadline(async () => (await this.plugin()).setItem(`office-orbit.${key}`, value)),
    );
  }
  async remove(key: string): Promise<void> {
    await this.withRetry(() => this.withDeadline(async () => (await this.plugin()).removeItem(`office-orbit.${key}`)));
  }
  // The Android Keystore can briefly fail on first access right after process
  // start; one short retry absorbs that without masking a genuine failure.
  private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch {
      await new Promise(resolve => setTimeout(resolve, 300));
      return operation();
    }
  }
  private async withDeadline<T>(operation: () => Promise<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation(),
        new Promise<never>((_, reject) => {
          // Two sequential startup reads, each retried once, must still fit inside
          // the StartupService deadline so a slow Keystore cannot stall the app.
          timer = setTimeout(() => reject(new Error('Secure storage did not respond.')), 4_000);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}
