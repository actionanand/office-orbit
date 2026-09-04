import { computed, Service, signal } from '@angular/core';
import { StoredToken } from '../storage/token-storage.service';

@Service()
export class AuthState {
  readonly session = signal<StoredToken | null>(null);
  readonly verified = signal(false);
  readonly authenticated = computed(() => this.verified() && this.session() !== null);
  readonly notice = signal('');
  clear(): void {
    this.verified.set(false);
    this.session.set(null);
  }
  valid(): boolean {
    return this.authenticated() && (this.session()?.expiresAt ?? 0) > Date.now();
  }
}
