import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SessionManagementService } from './session-management.service';

describe('SessionManagementService', () => {
  let service: SessionManagementService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(SessionManagementService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists sessions only when explicitly called', async () => {
    http.expectNone(`${environment.apiBaseUrl}/api/auth/sessions`);
    const pending = firstValueFrom(service.listActiveSessions());
    http.expectOne(`${environment.apiBaseUrl}/api/auth/sessions`).flush({ sessions: [] });
    await expect(pending).resolves.toEqual({ sessions: [] });
  });

  it('URL-encodes a session ID before revoking it', async () => {
    const pending = firstValueFrom(service.revokeSession('session/with space'));
    const request = http.expectOne(`${environment.apiBaseUrl}/api/auth/sessions/session%2Fwith%20space`);
    expect(request.request.method).toBe('DELETE');
    request.flush({ success: true, sessionId: 'session/with space', currentSession: false });
    await pending;
  });

  it('uses the dedicated logout-others and current-session endpoints', async () => {
    const others = firstValueFrom(service.revokeOtherSessions());
    const othersRequest = http.expectOne(`${environment.apiBaseUrl}/api/auth/sessions/logout-others`);
    expect(othersRequest.request.method).toBe('POST');
    othersRequest.flush({ success: true, revokedCount: 2 });
    await others;

    const current = firstValueFrom(service.logoutCurrentSession());
    const currentRequest = http.expectOne(`${environment.apiBaseUrl}/api/auth/logout`);
    expect(currentRequest.request.method).toBe('POST');
    currentRequest.flush({ success: true });
    await current;
  });
});
