import { Service } from '@angular/core';

// Shared app-private IndexedDB fallback for both the PIN record and, when native
// secure storage is unavailable, the session token. Not Keystore-backed; protected
// only by normal Android app-sandboxing, same tier already accepted for the PIN.
const DB_NAME = 'office-orbit-security';
const STORE_NAME = 'security';

@Service()
export class IndexedDbStoreService {
  private database?: Promise<IDBDatabase>;

  async get(key: string): Promise<string | null> {
    const store = await this.store('readonly');
    return (await this.request<string | undefined>(store.get(key))) ?? null;
  }
  async set(key: string, value: string): Promise<void> {
    const store = await this.store('readwrite');
    await this.request(store.put(value, key));
  }
  async remove(key: string): Promise<void> {
    const store = await this.store('readwrite');
    await this.request(store.delete(key));
  }
  private async store(mode: IDBTransactionMode): Promise<IDBObjectStore> {
    this.database ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onerror = () => reject(request.error ?? new Error('Unable to open local security storage.'));
      request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME);
      request.onsuccess = () => resolve(request.result);
    });
    return (await this.database).transaction(STORE_NAME, mode).objectStore(STORE_NAME);
  }
  private request<T>(request: IDBRequest<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Local security storage failed.'));
    });
  }
}
