import { HttpClient } from '@angular/common/http';
import { effect, inject, Service, signal } from '@angular/core';
import { environment } from '../../../environments/environment';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthState } from '../../core/auth/auth-state';
import {
  CredentialBulkDeleteResponse,
  CredentialEnvelope,
  CredentialListResponse,
  CredentialMutationResponse,
  CredentialVaultMetadata,
} from './credential.models';

@Service()
export class CredentialVaultApiService {
  private readonly http = inject(HttpClient);
  private readonly base = environment.apiBaseUrl;

  metadata() {
    return this.http.get<CredentialVaultMetadata>(`${this.base}/api/credentials/vault`);
  }
  initialize(body: {
    cryptoVersion: 1;
    kdf: 'PBKDF2-SHA-256';
    kdfIterations: number;
    salt: string;
    keyCheckIv: string;
    keyCheckCiphertext: string;
  }) {
    return this.http.post<CredentialVaultMetadata>(`${this.base}/api/credentials/vault`, body);
  }
  list() {
    return this.http.get<CredentialListResponse>(`${this.base}/api/credentials`);
  }
  create(body: CredentialEnvelope) {
    return this.http.post<CredentialMutationResponse>(`${this.base}/api/credentials`, body);
  }
  update(credentialId: string, body: CredentialEnvelope & { expectedRevision: number }) {
    return this.http.patch<CredentialMutationResponse>(
      `${this.base}/api/credentials/${encodeURIComponent(credentialId)}`,
      body,
    );
  }
  delete(credentialId: string) {
    return this.http.delete<void>(`${this.base}/api/credentials/${encodeURIComponent(credentialId)}`);
  }
  bulkDelete(credentialIds: string[]) {
    return this.http.post<CredentialBulkDeleteResponse>(`${this.base}/api/credentials/bulk-delete`, { credentialIds });
  }
}

@Service()
export class CredentialVaultSessionService {
  private readonly lockService = inject(AppLockService);
  private readonly auth = inject(AuthState);
  readonly key = signal<CryptoKey | null>(null);
  readonly lastActivity = signal(0);
  private timer?: ReturnType<typeof setTimeout>;

  constructor() {
    effect(() => {
      if (this.lockService.locked() || !this.auth.authenticated()) this.lock();
    });
  }

  unlock(key: CryptoKey): void {
    if (this.lockService.locked() || !this.auth.authenticated()) {
      this.lock();
      return;
    }
    this.key.set(key);
    this.touch();
  }

  touch(): void {
    if (!this.key()) return;
    this.lastActivity.set(Date.now());
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.lock(), 10 * 60_000);
  }

  lock(): void {
    clearTimeout(this.timer);
    this.timer = undefined;
    this.key.set(null);
    this.lastActivity.set(0);
  }
}
