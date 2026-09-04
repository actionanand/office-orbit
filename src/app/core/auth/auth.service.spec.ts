import { TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';
import { AuthState } from './auth-state';
import { TokenStorageService } from '../storage/token-storage.service';
import { environment } from '../../../environments/environment';
import { apiError } from '../api/api-error';
describe('AuthService', () => {
  let service: AuthService, http: HttpTestingController;
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
  it('saves only the access token and expiration on password login', async () => {
    const pending = service.login('entered-for-test');
    const request = http.expectOne(environment.apiBaseUrl + '/api/auth/login');
    expect(request.request.body).toEqual({ password: 'entered-for-test' });
    request.flush({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 3600 });
    await pending;
    expect(service.state.authenticated()).toBe(true);
    expect(storage.save.mock.calls[0][0]).toEqual({
      accessToken: 'test-token',
      expiresAt: Date.now() + 3600000,
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
    storage.read.mockResolvedValueOnce({ accessToken: 'restored', expiresAt: Date.now() + 60000 });
    const pending = service.restore();
    await Promise.resolve();
    expect(service.state.authenticated()).toBe(false);
    http.expectOne(environment.apiBaseUrl + '/api/auth/status').flush({
      authenticated: true,
      subject: 'owner',
      expiresAt: new Date(Date.now() + 30000).toISOString(),
    });
    await pending;
    expect(service.state.valid()).toBe(true);
  });
  it('discards a revoked token at startup', async () => {
    storage.read.mockResolvedValueOnce({ accessToken: 'revoked', expiresAt: Date.now() + 60000 });
    const pending = service.restore();
    await Promise.resolve();
    http.expectOne(environment.apiBaseUrl + '/api/auth/status').flush({}, { status: 401, statusText: 'Unauthorized' });
    await pending;
    expect(TestBed.inject(AuthState).session()).toBeNull();
    expect(storage.clear).toHaveBeenCalled();
  });
  it('provides safe invalid-password and network messages', () => {
    expect(apiError(new HttpErrorResponse({ status: 401 }), true)).toContain('password');
    expect(apiError(new HttpErrorResponse({ status: 0 }))).toContain('connection');
  });
});
