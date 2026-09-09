import { inject, Service } from '@angular/core';
import { NativeStorageService } from './native-storage.service';
import { PlatformService } from '../platform/platform.service';
import { IndexedDbStoreService } from './indexed-db-store';

@Service()
export class PinStorageService {
  private readonly native = inject(NativeStorageService);
  private readonly platform = inject(PlatformService);
  private readonly indexedDb = inject(IndexedDbStoreService);
  private nativeAvailable = true;

  async get(): Promise<string | null> {
    if (this.platform.android && this.nativeAvailable)
      try {
        return await this.native.get('pin');
      } catch {
        this.nativeAvailable = false;
      }
    return this.indexedDb.get('pin');
  }
  async set(value: string): Promise<void> {
    if (this.platform.android && this.nativeAvailable)
      try {
        await this.native.set('pin', value);
        return;
      } catch {
        this.nativeAvailable = false;
      }
    await this.indexedDb.set('pin', value);
  }
  async remove(): Promise<void> {
    if (this.platform.android && this.nativeAvailable)
      try {
        await this.native.remove('pin');
        return;
      } catch {
        this.nativeAvailable = false;
      }
    await this.indexedDb.remove('pin');
  }
}
