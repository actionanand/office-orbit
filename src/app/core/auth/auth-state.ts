import { computed, Service, signal } from '@angular/core';
import { StoredToken } from '../storage/token-storage.service';

@Service()
export class AuthState {
  readonly session = signal<StoredToken | null>(null);
  readonly verified = signal(false);
  readonly renewing = signal(false);
  readonly foreground = signal(true);
  readonly localLocked = signal(false);
  readonly lastActivityAt = signal(0);
  readonly authenticated = computed(() => this.verified() && this.session() !== null);
  readonly notice = signal('');
  clear(): void {
    this.verified.set(false);
    this.renewing.set(false);
    this.session.set(null);
  }
  valid(): boolean {
    const session = this.session();
    return this.authenticated() && !!session && session.expiresAt > Date.now() && session.sessionExpiresAt > Date.now();
  }
}
