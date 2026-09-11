import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular';
import { Observable, Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';
import {
  ActiveSession,
  ActiveSessionsResponse,
  SessionManagementService,
} from '../../core/auth/session-management.service';
import { ActiveSessionsModalComponent } from './active-sessions.modal';

describe('ActiveSessionsModal', () => {
  const current = session({ id: 'current', current: true, platform: 'android', name: 'Samsung SM-S921B' });
  const other = session({ id: 'other/session', platform: 'web', name: 'Chrome on Windows' });
  let listResult: Observable<ActiveSessionsResponse>;
  let sessionManagement: {
    listActiveSessions: ReturnType<typeof vi.fn>;
    revokeSession: ReturnType<typeof vi.fn>;
    revokeOtherSessions: ReturnType<typeof vi.fn>;
  };
  let auth: { signOut: ReturnType<typeof vi.fn> };
  let alerts: { create: ReturnType<typeof vi.fn> };

  function session(options: { id: string; current?: boolean; platform?: string; name?: string | null }): ActiveSession {
    return {
      id: options.id,
      current: options.current ?? false,
      device: {
        deviceId: 'private-install-id',
        name: options.name ?? null,
        platform: options.platform ?? 'unknown',
        model: options.platform === 'android' ? 'SM-S921B' : null,
        appVersion: '1.1.12',
      },
      ipAddress: 'private-ip',
      country: 'IN',
      createdAt: '2026-09-11T07:00:00.000Z',
      lastSeenAt: new Date().toISOString(),
      expiresAt: '2026-09-11T15:00:00.000Z',
    };
  }

  async function create() {
    sessionManagement = {
      listActiveSessions: vi.fn(() => listResult),
      revokeSession: vi.fn(() => of({ success: true, sessionId: other.id, currentSession: false })),
      revokeOtherSessions: vi.fn(() => of({ success: true, revokedCount: 1 })),
    };
    auth = { signOut: vi.fn().mockResolvedValue(undefined) };
    alerts = {
      create: vi.fn().mockResolvedValue({
        present: vi.fn().mockResolvedValue(undefined),
        onDidDismiss: vi.fn().mockResolvedValue({ role: 'confirm' }),
      }),
    };
    await TestBed.configureTestingModule({
      imports: [ActiveSessionsModalComponent],
      providers: [
        { provide: SessionManagementService, useValue: sessionManagement },
        { provide: AuthService, useValue: auth },
        { provide: AlertController, useValue: alerts },
      ],
    }).compileComponents();
    return TestBed.createComponent(ActiveSessionsModalComponent);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('requests once on opening and exposes an accessible loading state', async () => {
    const pending = new Subject<ActiveSessionsResponse>();
    listResult = pending;
    const fixture = await create();
    fixture.detectChanges();
    expect(sessionManagement.listActiveSessions).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.loading()).toBe(true);
  });

  it('renders current, platform, fallback, country, and app-version labels without private identifiers', async () => {
    listResult = of({ sessions: [other, current, session({ id: 'unknown', name: null })] });
    const fixture = await create();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.orderedSessions()[0].id).toBe('current');
    expect(page.deviceSummary(current)).toBe('Android • App 1.1.12');
    expect(page.deviceSummary(other)).toBe('Web • App 1.1.12');
    expect(page.deviceName(page.sessions()[2])).toBe('Unknown device');
    expect(page.countryName(current.country)).toBe('India');
    expect(page.deviceSummary(current)).not.toContain('private-install-id');
    expect(page.deviceSummary(current)).not.toContain('private-ip');
  });

  it('shows a safe list error and retries only after the user requests it', async () => {
    listResult = throwError(
      () => new HttpErrorResponse({ status: 503, error: { detail: 'database password and internal stack trace' } }),
    );
    const fixture = await create();
    fixture.detectChanges();
    expect(fixture.componentInstance.error()).toContain('temporarily unavailable');
    expect(fixture.componentInstance.error()).not.toContain('database password');
    expect(sessionManagement.listActiveSessions).toHaveBeenCalledOnce();

    listResult = of({ sessions: [current] });
    fixture.componentInstance.load();
    fixture.detectChanges();
    expect(sessionManagement.listActiveSessions).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.sessions()).toEqual([current]);
  });

  it('cancels its list subscription when closed and never polls', async () => {
    const pending = new Subject<ActiveSessionsResponse>();
    listResult = pending;
    const fixture = await create();
    expect(pending.observed).toBe(true);
    fixture.componentInstance.close();
    expect(pending.observed).toBe(false);
    expect(sessionManagement.listActiveSessions).toHaveBeenCalledOnce();
  });

  it('removes only another revoked session without signing out this client', async () => {
    listResult = of({ sessions: [current, other] });
    const fixture = await create();
    await fixture.componentInstance.logoutSession(other);
    expect(sessionManagement.revokeSession).toHaveBeenCalledWith('other/session');
    expect(fixture.componentInstance.sessions()).toEqual([current]);
    expect(auth.signOut).not.toHaveBeenCalled();
  });

  it('closes and clears local authentication when the server revokes the current session', async () => {
    listResult = of({ sessions: [current] });
    const fixture = await create();
    sessionManagement.revokeSession.mockReturnValueOnce(
      of({ success: true, sessionId: current.id, currentSession: true }),
    );
    const closed = vi.fn();
    fixture.componentInstance.closed.subscribe(closed);
    await fixture.componentInstance.logoutSession(current);
    expect(closed).toHaveBeenCalledOnce();
    expect(auth.signOut).toHaveBeenCalledOnce();
  });

  it('logs out all other sessions while preserving the current session locally', async () => {
    listResult = of({ sessions: [current, other] });
    const fixture = await create();
    await fixture.componentInstance.logoutOthers();
    expect(sessionManagement.revokeOtherSessions).toHaveBeenCalledOnce();
    expect(fixture.componentInstance.sessions()).toEqual([current]);
    expect(auth.signOut).not.toHaveBeenCalled();
  });
});
