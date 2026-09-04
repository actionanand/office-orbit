import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptor';
import { AuthState } from '../auth/auth-state';
import { TokenStorageService } from '../storage/token-storage.service';
import { environment } from '../../../environments/environment';
describe('authInterceptor', () => {
  let http: HttpTestingController, client: HttpClient, state: AuthState;
  const storage = { clear: vi.fn().mockResolvedValue(undefined) };
  const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
  beforeEach(() => {
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: TokenStorageService, useValue: storage },
        { provide: Router, useValue: router },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    client = TestBed.inject(HttpClient);
    state = TestBed.inject(AuthState);
    state.session.set({ accessToken: 'test-bearer', expiresAt: Date.now() + 60000 });
    state.verified.set(true);
  });
  afterEach(() => http.verify());
  it('attaches bearer only to protected requests on the exact Worker origin', () => {
    for (const url of [
      environment.apiBaseUrl + '/api/jiras',
      environment.apiBaseUrl + '/api/auth/login',
      'https://example.com/api/jiras',
      environment.apiBaseUrl + '.example.com/api/jiras',
    ]) {
      client.get(url).subscribe();
      const request = http.expectOne(url);
      expect(request.request.headers.has('Authorization')).toBe(url === environment.apiBaseUrl + '/api/jiras');
      request.flush({});
    }
  });
  it('clears state and redirects on protected 401', () => {
    client.get(environment.apiBaseUrl + '/api/jiras').subscribe({ error: () => undefined });
    http.expectOne(environment.apiBaseUrl + '/api/jiras').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(state.session()).toBeNull();
    expect(state.authenticated()).toBe(false);
    expect(storage.clear).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login', { replaceUrl: true });
  });
  it('does not redirect or erase a session for a login failure', () => {
    client.post(environment.apiBaseUrl + '/api/auth/login', {}).subscribe({ error: () => undefined });
    http.expectOne(environment.apiBaseUrl + '/api/auth/login').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(state.session()).not.toBeNull();
  });
  it('ignores stale unauthorized responses after a new session is established', () => {
    client.get(environment.apiBaseUrl + '/api/jiras').subscribe({ error: () => undefined });
    state.session.set({ accessToken: 'new-token', expiresAt: Date.now() + 60000 });
    http.expectOne(environment.apiBaseUrl + '/api/jiras').flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(state.session()?.accessToken).toBe('new-token');
  });
});
