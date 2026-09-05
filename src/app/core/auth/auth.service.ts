import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService, StoredToken } from '../storage/token-storage.service';
import { AuthState } from './auth-state';
import { DataCacheService } from '../cache/data-cache.service';
import { NavigationStateService } from '../cache/navigation-state.service';

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}
interface AuthStatus {
  authenticated: boolean;
  subject: string;
  expiresAt: string;
}

@Service()
export class AuthService {
  readonly state = inject(AuthState);
  private readonly http = inject(HttpClient);
  private readonly storage = inject(TokenStorageService);
  private readonly router = inject(Router);
  private readonly dataCache = inject(DataCacheService);
  private readonly navigationState = inject(NavigationStateService);
  private expiryTimer?: ReturnType<typeof setTimeout>;
  private armExpiry(session: StoredToken): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(
      () => {
        void this.signOut('Your session has expired. Please sign in again.');
      },
      Math.min(session.expiresAt - Date.now(), 2_147_483_647),
    );
  }
  async restore(): Promise<void> {
    clearTimeout(this.expiryTimer);
    this.state.clear();
    const session = await this.storage.read();
    if (!session) return;
    this.state.session.set(session);
    try {
      await this.validate();
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.state.clear();
        await this.storage.clear();
        return;
      }
      throw error;
    }
  }
  async validate(): Promise<void> {
    const session = this.state.session();
    if (!session || session.expiresAt <= Date.now()) {
      this.state.clear();
      await this.storage.clear();
      return;
    }
    const status = await firstValueFrom(
      this.http.get<AuthStatus>(`${environment.apiBaseUrl}/api/auth/status`).pipe(timeout(15000)),
    );
    if (this.state.session() !== session) return;
    const serverExpiry = Date.parse(status.expiresAt);
    if (status.authenticated !== true || !Number.isFinite(serverExpiry) || serverExpiry <= Date.now()) {
      this.state.clear();
      await this.storage.clear();
      return;
    }
    const verified = { ...session, expiresAt: Math.min(session.expiresAt, serverExpiry) };
    await this.storage.save(verified);
    if (this.state.session() !== session) return;
    this.state.session.set(verified);
    this.state.verified.set(true);
    this.armExpiry(verified);
  }
  async login(password: string): Promise<void> {
    const result = await firstValueFrom(
      this.http.post<LoginResponse>(`${environment.apiBaseUrl}/api/auth/login`, { password }).pipe(timeout(15000)),
    );
    if (
      typeof result.accessToken !== 'string' ||
      !result.accessToken ||
      result.tokenType !== 'Bearer' ||
      !Number.isFinite(result.expiresIn) ||
      result.expiresIn <= 0
    )
      throw new Error('Invalid session response');
    const session = { accessToken: result.accessToken, expiresAt: Date.now() + result.expiresIn * 1000 };
    await this.storage.save(session);
    this.state.session.set(session);
    this.state.verified.set(true);
    this.state.notice.set('');
    this.armExpiry(session);
  }
  async signOut(notice = ''): Promise<void> {
    clearTimeout(this.expiryTimer);
    this.dataCache.clear();
    this.navigationState.clear();
    this.state.clear();
    this.state.notice.set(notice);
    const clearing = this.storage.clear();
    void this.router.navigateByUrl('/login', { replaceUrl: true });
    try {
      await clearing;
    } catch {
      this.state.notice.set('Signed out locally. Secure storage could not be cleared. Please restart and try again.');
    }
  }
}
