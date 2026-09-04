import { inject, Service } from '@angular/core';
import { PlatformService } from '../platform/platform.service';
import { NativeStorageService } from './native-storage.service';

export interface StoredToken {
  accessToken: string;
  expiresAt: number;
}

@Service()
export class TokenStorageService {
  private readonly platform = inject(PlatformService);
  private readonly native = inject(NativeStorageService);
  private readonly key = 'office-orbit.session';
  private pending: Promise<void> = Promise.resolve();
  async read(): Promise<StoredToken | null> {
    await this.pending.catch(() => undefined);
    const raw = this.platform.android ? await this.native.get('session') : sessionStorage.getItem(this.key);
    if (!raw) return null;
    try {
      const value: unknown = JSON.parse(raw);
      if (
        typeof value === 'object' &&
        value !== null &&
        'accessToken' in value &&
        typeof value.accessToken === 'string' &&
        value.accessToken.length > 0 &&
        'expiresAt' in value &&
        typeof value.expiresAt === 'number' &&
        Number.isFinite(value.expiresAt) &&
        value.expiresAt > Date.now()
      ) {
        return { accessToken: value.accessToken, expiresAt: value.expiresAt };
      }
    } catch {
      /* Corrupt sessions are discarded. */
    }
    await this.clear();
    return null;
  }
  private enqueue(operation: () => Promise<void>): Promise<void> {
    const result = this.pending.catch(() => undefined).then(operation);
    this.pending = result;
    return result;
  }
  save(value: StoredToken): Promise<void> {
    return this.enqueue(async () => {
      if (this.platform.android) await this.native.set('session', JSON.stringify(value));
      else sessionStorage.setItem(this.key, JSON.stringify(value));
    });
  }
  clear(): Promise<void> {
    return this.enqueue(async () => {
      if (this.platform.android) await this.native.remove('session');
      else sessionStorage.removeItem(this.key);
    });
  }
}
