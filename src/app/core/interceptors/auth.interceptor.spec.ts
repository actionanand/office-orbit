import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthState } from '../auth/auth-state';
import { TokenStorageService } from '../storage/token-storage.service';
import { environment } from '../../../environments/environment';
import { apiRetryInterceptor } from './api-retry.interceptor';
import { DataCacheService } from '../cache/data-cache.service';
import { NavigationStateService } from '../cache/navigation-state.service';
describe('authInterceptor', () => {
  let http: HttpTestingController, client: HttpClient, state: AuthState;
  const storage = { clear: vi.fn().mockResolvedValue(undefined) };
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  const session = (accessToken = 'test-bearer') => ({
    accessToken,
    expiresAt: Date.now() + 60000,
    renewAfter: Date.now() + 30000,
    sessionExpiresAt: Date.now() + 600000,
    sessionKind: 'fresh' as const,
  });
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor, apiRetryInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStorageService, useValue: storage },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    state = TestBed.inject(AuthState);
    state.session.set(session());
    state.verified.set(true);
  });
  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });
  it('attaches bearer only to protected requests on the exact Worker origin', () => {
    for (const url of [
      environment.apiBaseUrl + '/api/jiras',
      environment.apiBaseUrl + '/api/auth/renew',
      environment.apiBaseUrl + '/api/settings/work-calendar',
      environment.apiBaseUrl + '/api/auth/login',
      'https://example.com/api/jiras',
      `https://docs.google.com/spreadsheets/d/${environment.GOOGLE_SHEET_ID}/gviz/tq?tqx=out:json&gid=${environment.ROTA_SHEET_GID}`,
      environment.apiBaseUrl + '.example.com/api/jiras',
    ]) {
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(
        url === environment.apiBaseUrl + '/api/jiras' ||
          url === environment.apiBaseUrl + '/api/auth/renew' ||
          url === environment.apiBaseUrl + '/api/settings/work-calendar',
      );
      request.flush({});
    }
  });
  it('attaches the bearer token to QUERY requests', () => {
    client.request('QUERY', environment.apiBaseUrl + '/api/tasks', { body: { filters: {} } }).subscribe();
    const request = http.expectOne(environment.apiBaseUrl + '/api/tasks');
    expect(request.request.method).toBe('QUERY');
    expect(request.request.headers.get('Authorization')).toBe('Bearer test-bearer');
    request.flush({ data: [] });
  });
  it('clears state and redirects on protected 401', () => {
    const cacheClear = vi.spyOn(TestBed.inject(DataCacheService), 'clear');
    const navigationClear = vi.spyOn(TestBed.inject(NavigationStateService), 'clear');
    client.get(environment.apiBaseUrl + '/api/jiras').subscribe({ error: () => undefined });
    http.expectOne(environment.apiBaseUrl + '/api/jiras').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(state.session()).toBeNull();
    expect(state.authenticated()).toBe(false);
    expect(storage.clear).toHaveBeenCalledOnce();
    expect(cacheClear).toHaveBeenCalledOnce();
    expect(navigationClear).toHaveBeenCalledOnce();
    expect(state.notice()).toBe('Your session has expired. Please sign in again.');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
    expect(router.navigateByUrl).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(60_000);
    http.expectNone(environment.apiBaseUrl + '/api/jiras');
  });
  it('preserves Authorization on every attempt and leaves the session intact during transient failures', () => {
    const url = environment.apiBaseUrl + '/api/jiras';
    const next = vi.fn();
    const error = vi.fn();
    client.get(url).subscribe({ next, error });
    for (let attempt = 0; attempt < 3; attempt++) {
      const request = http.expectOne(url);
      expect(request.request.headers.get('Authorization')).toBe('Bearer test-bearer');
      if (attempt === 2) request.flush({ data: [] });
      else {
        request.flush({}, { status: 503, statusText: 'Unavailable' });
        expect(error).not.toHaveBeenCalled();
        expect(storage.clear).not.toHaveBeenCalled();
        expect(router.navigateByUrl).not.toHaveBeenCalled();
        expect(state.session()?.accessToken).toBe('test-bearer');
        vi.advanceTimersByTime(attempt === 0 ? 1500 : 3000);
      }
    }
    expect(next).toHaveBeenCalledExactlyOnceWith({ data: [] });
    expect(error).not.toHaveBeenCalled();
  });
  it('does not redirect or erase a session for a login failure', () => {
    client.post(environment.apiBaseUrl + '/api/auth/login', {}).subscribe({ error: () => undefined });
    http.expectOne(environment.apiBaseUrl + '/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(state.session()).not.toBeNull();
  });
  it('ignores stale unauthorized responses after a new session is established', () => {
    client.get(environment.apiBaseUrl + '/api/jiras').subscribe({ error: () => undefined });
    state.session.set(session('new-token'));
    http.expectOne(environment.apiBaseUrl + '/api/jiras').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(state.session()?.accessToken).toBe('new-token');
  });
});
