import { inject, Service } from '@angular/core';
import { PlatformService } from '../platform/platform.service';
import { NativeStorageService } from './native-storage.service';
import { IndexedDbStoreService } from './indexed-db-store';

export interface StoredToken {
  accessToken: string;
  expiresAt: number;
  renewAfter: number;
  sessionStartedAt?: number;
  sessionExpiresAt: number;
  sessionKind: 'fresh' | 'extended';
}

@Service()
export class TokenStorageService {
  private readonly platform = inject(PlatformService);
  private readonly native = inject(NativeStorageService);
  private readonly indexedDb = inject(IndexedDbStoreService);
  private readonly key = 'office-orbit.session';
  private pending: Promise<void> = Promise.resolve();
  private volatileSession: StoredToken | null = null;
  // A device whose Keystore-backed storage never responds must still let a
  // session persist across restarts; the app-sandboxed IndexedDB store used for
  // the PIN is a proven, lower (but still app-private) tier of protection.
  private nativeAvailable = true;
  async read(): Promise<StoredToken | null> {
    await this.pending.catch(() => undefined);
    let raw: string | null;
    if (this.platform.android) {
      if (this.nativeAvailable) {
        try {
          raw = await this.native.get('session');
        } catch {
          this.nativeAvailable = false;
          raw = await this.indexedDb
            .get('session')
            .catch(() => (this.volatileSession ? JSON.stringify(this.volatileSession) : null));
        }
      } else {
        raw = await this.indexedDb
          .get('session')
          .catch(() => (this.volatileSession ? JSON.stringify(this.volatileSession) : null));
      }
    } else raw = sessionStorage.getItem(this.key);
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
        const renewAfter =
          'renewAfter' in value && typeof value.renewAfter === 'number' && Number.isFinite(value.renewAfter)
            ? value.renewAfter
            : value.expiresAt - 15 * 60 * 1000;
        const sessionExpiresAt =
          'sessionExpiresAt' in value &&
          typeof value.sessionExpiresAt === 'number' &&
          Number.isFinite(value.sessionExpiresAt)
            ? value.sessionExpiresAt
            : value.expiresAt;
        if (sessionExpiresAt <= Date.now()) {
          await this.clear();
          return null;
        }
        return {
          accessToken: value.accessToken,
          expiresAt: value.expiresAt,
          renewAfter,
          sessionStartedAt:
            'sessionStartedAt' in value && typeof value.sessionStartedAt === 'number'
              ? value.sessionStartedAt
              : undefined,
          sessionExpiresAt,
          sessionKind: 'sessionKind' in value && value.sessionKind === 'extended' ? 'extended' : 'fresh',
        };
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
      if (this.platform.android) {
        this.volatileSession = value;
        const json = JSON.stringify(value);
        if (this.nativeAvailable) {
          try {
            await this.native.set('session', json);
            return;
          } catch {
            this.nativeAvailable = false;
          }
        }
        // Durably fall back rather than leaving only a memory-only session.
        await this.indexedDb.set('session', json);
      } else sessionStorage.setItem(this.key, JSON.stringify(value));
    });
  }
  clear(): Promise<void> {
    return this.enqueue(async () => {
      if (this.platform.android) {
        this.volatileSession = null;
        const [nativeResult, idbResult] = await Promise.allSettled([
          this.native.remove('session'),
          this.indexedDb.remove('session'),
        ]);
        if (nativeResult.status === 'rejected' && idbResult.status === 'rejected') throw nativeResult.reason;
      } else sessionStorage.removeItem(this.key);
    });
  }
}
