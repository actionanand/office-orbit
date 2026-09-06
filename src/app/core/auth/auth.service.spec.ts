import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthState } from './auth-state';
import { TokenStorageService } from '../storage/token-storage.service';
import { environment } from '../../../environments/environment';
import { apiError } from '../api/api-error';
import { DataCacheService } from '../cache/data-cache.service';
describe('AuthService', () => {
  let service: AuthService, http: HttpTestingController;
  const session = (overrides: Record<string, number | string> = {}) => ({
    accessToken: 'restored',
    expiresAt: Date.now() + 60000,
    renewAfter: Date.now() + 45000,
    sessionExpiresAt: Date.now() + 600000,
    ...overrides,
  });
  const storage = {
    read: vi.fn(),
    save: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
  };
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'login', children: [] }]),
        { provide: TokenStorageService, useValue: storage },
      ],
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => {
    http.verify();
    vi.clearAllTimers();
    vi.useRealTimers();
  });
  it('stores Worker timing metadata on password login', async () => {
    const pending = service.login('entered-for-test');
    const request = http.expectOne(environment.apiBaseUrl + '/api/auth/login');
    expect(request.request.body).toEqual({ password: 'entered-for-test' });
    request.flush({
      accessToken: 'test-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      renewAfter: new Date(Date.now() + 2700000).toISOString(),
      sessionExpiresAt: new Date(Date.now() + 28800000).toISOString(),
    });
    await pending;
    expect(service.state.authenticated()).toBe(true);
    expect(storage.save.mock.calls[0][0]).toEqual({
      accessToken: 'test-token',
      expiresAt: Date.now() + 3600000,
      renewAfter: Date.now() + 2700000,
      sessionStartedAt: undefined,
      sessionExpiresAt: Date.now() + 28800000,
    });
  });
  it('keeps failed login unauthenticated and explains 429', async () => {
    const pending = service.login('entered-for-test').catch(error => error);
    http
      .expectOne(environment.apiBaseUrl + '/api/auth/login')
      .flush({}, { status: 429, statusText: 'Too Many Requests' });
    const error: unknown = await pending;
    expect(apiError(error, true)).toContain('Too many attempts');
    expect(service.state.authenticated()).toBe(false);
    expect(storage.save).not.toHaveBeenCalled();
  });
  it('verifies a restored token with the Worker before authenticating', async () => {
    storage.read.mockResolvedValueOnce(session());
    const pending = service.restore();
    await Promise.resolve();
    expect(service.state.authenticated()).toBe(false);
    http.expectOne(environment.apiBaseUrl + '/api/auth/status').flush({
      authenticated: true,
      subject: 'owner',
      expiresAt: new Date(Date.now() + 30000).toISOString(),
      renewAfter: new Date(Date.now() + 15000).toISOString(),
      sessionStartedAt: new Date(Date.now() - 300000).toISOString(),
      sessionExpiresAt: new Date(Date.now() + 300000).toISOString(),
    });
    await pending;
    expect(service.state.valid()).toBe(true);
    expect(service.state.session()?.renewAfter).toBe(Date.now() + 15000);
    expect(service.state.session()?.sessionExpiresAt).toBe(Date.now() + 300000);
  });
  it('discards a revoked token at startup', async () => {
    storage.read.mockResolvedValueOnce(session({ accessToken: 'revoked' }));
    const pending = service.restore();
    await Promise.resolve();
    http.expectOne(environment.apiBaseUrl + '/api/auth/status').flush({}, { status: 401, statusText: 'Unauthorized' });
    await pending;
    expect(TestBed.inject(AuthState).session()).toBeNull();
    expect(storage.clear).toHaveBeenCalled();
  });
  it('continues unauthenticated when restored-session validation is unavailable', async () => {
    storage.read.mockResolvedValueOnce(session({ accessToken: 'unverified' }));
    const pending = service.restore();
    await Promise.resolve();
    http.expectOne(environment.apiBaseUrl + '/api/auth/status').error(new ProgressEvent('network'));
    await pending;
    expect(service.state.valid()).toBe(false);
    expect(service.state.notice()).toContain('Sign in again');
    expect(storage.clear).not.toHaveBeenCalled();
  });
  it('provides safe invalid-password and network messages', () => {
    expect(apiError(new HttpErrorResponse({ status: 401 }), true)).toContain('password');
    expect(apiError(new HttpErrorResponse({ status: 0 }))).toContain('connection');
  });
  it('clears authenticated data when signing out', async () => {
    const cache = TestBed.inject(DataCacheService);
    cache.set('dashboard:all', { private: true });
    await service.signOut();
    expect(cache.size()).toBe(0);
  });
  it('does not renew before renewAfter', async () => {
    const current = session({ renewAfter: Date.now() + 60000 });
    service.state.session.set(current);
    service.state.verified.set(true);
    service.state.lastActivityAt.set(Date.now());
    await service.evaluateRenewal();
    http.expectNone(environment.apiBaseUrl + '/api/auth/renew');
  });
  it('renews once in the renewal window and replaces the access token', async () => {
    const current = session({ renewAfter: Date.now() - 1 });
    service.state.session.set(current);
    service.state.verified.set(true);
    service.state.lastActivityAt.set(Date.now());
    const first = service.evaluateRenewal();
    const second = service.evaluateRenewal();
    const request = http.expectOne(environment.apiBaseUrl + '/api/auth/renew');
    expect(request.request.body).toBeNull();
    request.flush({
      renewed: true,
      accessToken: 'renewed-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
      renewAfter: new Date(Date.now() + 2700000).toISOString(),
      sessionExpiresAt: new Date(Date.now() + 600000).toISOString(),
    });
    await Promise.all([first, second]);
    expect(service.state.session()?.accessToken).toBe('renewed-token');
    expect(storage.save).toHaveBeenLastCalledWith(expect.objectContaining({ accessToken: 'renewed-token' }));
  });
  it('keeps the current token when renewal is not yet due', async () => {
    const current = session({ renewAfter: Date.now() - 1 });
    service.state.session.set(current);
    service.state.verified.set(true);
    service.state.lastActivityAt.set(Date.now());
    const pending = service.evaluateRenewal();
    http.expectOne(environment.apiBaseUrl + '/api/auth/renew').flush({
      renewed: false,
      expiresAt: new Date(Date.now() + 60000).toISOString(),
      renewAfter: new Date(Date.now() + 45000).toISOString(),
      sessionExpiresAt: new Date(Date.now() + 600000).toISOString(),
    });
    await pending;
    expect(service.state.session()?.accessToken).toBe('restored');
  });
  it('does not renew while hidden, inactive, or locally locked', async () => {
    service.state.session.set(session({ renewAfter: Date.now() - 1 }));
    service.state.verified.set(true);
    service.state.lastActivityAt.set(Date.now() - 11 * 60 * 1000);
    await service.evaluateRenewal();
    http.expectNone(environment.apiBaseUrl + '/api/auth/renew');
    service.state.lastActivityAt.set(Date.now());
    service.setForeground(false);
    await service.evaluateRenewal();
    http.expectNone(environment.apiBaseUrl + '/api/auth/renew');
    service.setForeground(true);
    service.state.localLocked.set(true);
    await service.evaluateRenewal();
    http.expectNone(environment.apiBaseUrl + '/api/auth/renew');
  });
  it('does not spin timers when renewal is overdue but blocked', async () => {
    service.state.session.set(session({ renewAfter: Date.now() - 1 }));
    service.state.verified.set(true);
    service.state.localLocked.set(true);
    service.state.lastActivityAt.set(Date.now());
    await service.evaluateRenewal();
    await vi.advanceTimersByTimeAsync(59_000);
    http.expectNone(environment.apiBaseUrl + '/api/auth/renew');
  });
  it('keeps a valid token after temporary renewal failure but clears on renewal 401', async () => {
    service.state.session.set(session({ expiresAt: Date.now() + 120000, renewAfter: Date.now() - 1 }));
    service.state.verified.set(true);
    service.state.lastActivityAt.set(Date.now());
    const temporary = service.evaluateRenewal();
    http.expectOne(environment.apiBaseUrl + '/api/auth/renew').flush({}, { status: 503, statusText: 'Unavailable' });
    await temporary;
    expect(service.state.session()?.accessToken).toBe('restored');

    vi.advanceTimersByTime(60000);
    const unauthorized = service.evaluateRenewal();
    http.expectOne(environment.apiBaseUrl + '/api/auth/renew').flush({}, { status: 401, statusText: 'Unauthorized' });
    await unauthorized;
    expect(service.state.session()).toBeNull();
  });
});
