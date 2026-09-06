import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Router } from '@angular/router';
import { firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { TokenStorageService, StoredToken } from '../storage/token-storage.service';
import { AuthState } from './auth-state';
import { DataCacheService } from '../cache/data-cache.service';
import { NavigationStateService } from '../cache/navigation-state.service';
import {
  ACCESS_TOKEN_RENEWAL_WINDOW_MS,
  ACTIVITY_THROTTLE_MS,
  ACTIVE_SESSION_WINDOW_MS,
  EXPIRY_SAFETY_WINDOW_MS,
  RENEW_RETRY_BACKOFF_MS,
} from './session-policy';

interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
  expiresAt?: string;
  renewAfter?: string;
  sessionExpiresAt?: string;
}
interface AuthStatus {
  authenticated: boolean;
  subject: string;
  expiresAt?: string;
  renewAfter?: string;
  sessionStartedAt?: string;
  sessionExpiresAt?: string;
}
interface RenewResponse {
  renewed: boolean;
  accessToken?: string;
  tokenType?: string;
  expiresIn?: number;
  expiresAt?: string;
  renewAfter?: string;
  sessionExpiresAt?: string;
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
  private renewalTimer?: ReturnType<typeof setTimeout>;
  private renewalFlight?: Promise<void>;
  private listenersInstalled = false;
  private nextRenewAttemptAt = 0;
  private armExpiry(session: StoredToken): void {
    clearTimeout(this.expiryTimer);
    this.expiryTimer = setTimeout(
      () => {
        void this.signOut('Your session has expired. Please sign in again.');
      },
      Math.min(session.expiresAt - Date.now(), 2_147_483_647),
    );
  }
  private parseTimestamp(value: string | undefined): number | undefined {
    if (!value) return undefined;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  private sessionFromResponse(
    response: LoginResponse | RenewResponse | AuthStatus,
    current: StoredToken | null,
  ): StoredToken {
    const now = Date.now();
    const expiresIn = 'expiresIn' in response ? response.expiresIn : undefined;
    const expiresAt =
      this.parseTimestamp(response.expiresAt) ??
      (typeof expiresIn === 'number' && Number.isFinite(expiresIn) ? now + expiresIn * 1000 : current?.expiresAt);
    if (!expiresAt || expiresAt <= now) throw new Error('Invalid session response');
    const sessionExpiresAt = this.parseTimestamp(response.sessionExpiresAt) ?? current?.sessionExpiresAt ?? expiresAt;
    if (sessionExpiresAt <= now) throw new Error('Invalid session response');
    const renewAfter =
      this.parseTimestamp(response.renewAfter) ??
      current?.renewAfter ??
      Math.max(now, expiresAt - ACCESS_TOKEN_RENEWAL_WINDOW_MS);
    return {
      accessToken:
        'accessToken' in response && response.accessToken ? response.accessToken : (current?.accessToken ?? ''),
      expiresAt,
      renewAfter,
      sessionStartedAt: this.parseTimestamp((response as AuthStatus).sessionStartedAt) ?? current?.sessionStartedAt,
      sessionExpiresAt,
    };
  }
  private setSession(session: StoredToken): void {
    this.state.session.set(session);
    this.state.verified.set(true);
    this.state.notice.set('');
    this.armExpiry(session);
    this.scheduleRenewal();
  }
  private scheduleRenewal(): void {
    clearTimeout(this.renewalTimer);
    const session = this.state.session();
    if (!session || !this.state.verified()) return;
    const untilRenewal = session.renewAfter - Date.now();
    const delay = untilRenewal > 0 ? Math.min(untilRenewal, 60_000) : 60_000;
    this.renewalTimer = setTimeout(() => void this.evaluateRenewal(), delay);
  }
  private recentlyActive(now = Date.now()): boolean {
    return now - this.state.lastActivityAt() <= ACTIVE_SESSION_WINDOW_MS;
  }
  installActivityTracking(): void {
    if (this.listenersInstalled) return;
    this.listenersInstalled = true;
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    this.state.foreground.set(document.visibilityState !== 'hidden');
    const onActivity = () => this.recordActivity();
    for (const event of ['pointerdown', 'keydown', 'click']) {
      window.addEventListener(event, onActivity, { passive: true });
    }
    document.addEventListener('visibilitychange', () => {
      const foreground = document.visibilityState !== 'hidden';
      this.setForeground(foreground);
      if (foreground) this.recordActivity();
    });
  }
  recordActivity(now = Date.now()): void {
    if (now - this.state.lastActivityAt() < ACTIVITY_THROTTLE_MS) return;
    this.state.lastActivityAt.set(now);
    void this.evaluateRenewal();
  }
  setForeground(foreground: boolean): void {
    this.state.foreground.set(foreground);
    if (foreground) {
      this.recordActivity();
      this.scheduleRenewal();
    } else {
      clearTimeout(this.renewalTimer);
    }
  }
  async evaluateRenewal(): Promise<void> {
    const session = this.state.session();
    const now = Date.now();
    if (!session || !this.state.verified()) return;
    if (now >= session.sessionExpiresAt || now >= session.expiresAt) {
      await this.signOut('Your work session has ended. Sign in again to continue.');
      return;
    }
    if (
      !this.state.foreground() ||
      this.state.localLocked() ||
      !this.recentlyActive(now) ||
      now < session.renewAfter ||
      now >= session.expiresAt - EXPIRY_SAFETY_WINDOW_MS ||
      now < this.nextRenewAttemptAt
    ) {
      this.scheduleRenewal();
      return;
    }
    await this.renew();
  }
  private async renew(): Promise<void> {
    if (this.renewalFlight) return this.renewalFlight;
    this.state.renewing.set(true);
    this.renewalFlight = this.performRenewal().finally(() => {
      this.state.renewing.set(false);
      this.renewalFlight = undefined;
    });
    return this.renewalFlight;
  }
  private async performRenewal(): Promise<void> {
    const session = this.state.session();
    if (!session) return;
    try {
      const response = await firstValueFrom(
        this.http.post<RenewResponse>(`${environment.apiBaseUrl}/api/auth/renew`, null).pipe(timeout(15000)),
      );
      if (this.state.session() !== session) return;
      if (response.renewed && (!response.accessToken || response.tokenType !== 'Bearer')) {
        throw new Error('Invalid session response');
      }
      const next = response.renewed
        ? this.sessionFromResponse(response, session)
        : { ...session, ...this.sessionFromResponse({ ...response, accessToken: session.accessToken }, session) };
      await this.storage.save(next);
      if (this.state.session() !== session) return;
      this.setSession(next);
      this.nextRenewAttemptAt = 0;
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        await this.signOut('Your work session has ended. Sign in again to continue.');
        return;
      }
      if (this.state.session() === session && session.expiresAt > Date.now()) {
        this.nextRenewAttemptAt = Date.now() + RENEW_RETRY_BACKOFF_MS;
        this.scheduleRenewal();
        return;
      }
      await this.signOut('Your session has expired. Please sign in again.');
    }
  }
  async restore(): Promise<void> {
    clearTimeout(this.expiryTimer);
    clearTimeout(this.renewalTimer);
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
      // A restored token is never trusted when validation is unavailable, but
      // the login route must remain reachable so the user can authenticate again.
      this.state.clear();
      this.state.notice.set('Your previous session could not be restored. Sign in again to continue.');
    }
  }
  async validate(): Promise<void> {
    const session = this.state.session();
    if (!session || session.expiresAt <= Date.now() || session.sessionExpiresAt <= Date.now()) {
      this.state.clear();
      await this.storage.clear();
      return;
    }
    const status = await firstValueFrom(
      this.http.get<AuthStatus>(`${environment.apiBaseUrl}/api/auth/status`).pipe(timeout(15000)),
    );
    if (this.state.session() !== session) return;
    if (status.authenticated !== true) {
      this.state.clear();
      await this.storage.clear();
      return;
    }
    const verified = this.sessionFromResponse(status, session);
    await this.storage.save(verified);
    if (this.state.session() !== session) return;
    this.setSession(verified);
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
    const session = this.sessionFromResponse(result, null);
    await this.storage.save(session);
    this.state.lastActivityAt.set(Date.now());
    this.setSession(session);
  }
  async signOut(notice = ''): Promise<void> {
    clearTimeout(this.expiryTimer);
    clearTimeout(this.renewalTimer);
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
