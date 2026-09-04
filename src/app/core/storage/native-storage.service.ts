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
    return (await this.plugin()).getItem(`office-orbit.${key}`);
  }
  async set(key: string, value: string): Promise<void> {
    await (await this.plugin()).setItem(`office-orbit.${key}`, value);
  }
  async remove(key: string): Promise<void> {
    await (await this.plugin()).removeItem(`office-orbit.${key}`);
  }
}
