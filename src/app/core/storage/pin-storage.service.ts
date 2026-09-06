import { inject, Service } from '@angular/core';
import { NativeStorageService } from './native-storage.service';

@Service()
export class PinStorageService {
  private readonly native = inject(NativeStorageService);
  private nativeAvailable = true;
  private database?: Promise<IDBDatabase>;

  async get(): Promise<string | null> {
    if (this.nativeAvailable)
      try {
        return await this.native.get('pin');
      } catch {
        this.nativeAvailable = false;
      }
    return (await this.request<string | undefined>((await this.store('readonly')).get('pin'))) ?? null;
  }
  async set(value: string): Promise<void> {
    if (this.nativeAvailable)
      try {
        await this.native.set('pin', value);
        return;
      } catch {
        this.nativeAvailable = false;
      }
    await this.request((await this.store('readwrite')).put(value, 'pin'));
  }
  async remove(): Promise<void> {
    if (this.nativeAvailable)
      try {
        await this.native.remove('pin');
        return;
      } catch {
        this.nativeAvailable = false;
      }
    await this.request((await this.store('readwrite')).delete('pin'));
  }
  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('office-orbit-security', 1);
      request.onerror = () => reject(request.error ?? new Error('Unable to open local security storage.'));
      request.onupgradeneeded = () => request.result.createObjectStore('security');
      request.onsuccess = () => resolve(request.result);
    });
    return (await this.database).transaction('security', mode).objectStore('security');
  }
  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Local security storage failed.'));
    });
  }
}
