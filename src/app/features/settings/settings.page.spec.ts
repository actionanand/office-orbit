import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthService } from '../../core/auth/auth.service';
import { BiometricService } from '../../core/platform/biometric.service';
import { PlatformService } from '../../core/platform/platform.service';
import { ThemeService } from '../../core/theme/theme.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  afterEach(() => vi.useRealTimers());

  async function renderSession(sessionKind: 'fresh' | 'extended', expiresAt: number, sessionExpiresAt: number) {
    const session = signal({
      accessToken: 'hidden',
      expiresAt,
      renewAfter: Date.now() + 45000,
      sessionExpiresAt,
      sessionKind,
    });
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: ThemeService, useValue: { mode: signal('system'), set: vi.fn() } },
        { provide: PlatformService, useValue: { android: false, label: 'Web' } },
        { provide: AuthService, useValue: { signOut: vi.fn(), state: { session } } },
        {
          provide: AppLockService,
          useValue: {
            enabled: signal(false),
            biometricEnabled: signal(false),
            setPin: vi.fn(),
            disable: vi.fn(),
            setBiometric: vi.fn(),
          },
        },
        { provide: BiometricService, useValue: { available: signal(false) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows a fresh session with the actual same-day token expiry and no ceiling explanation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 10, 0));
    const expiresAt = new Date(2026, 8, 7, 11, 12).getTime();
    const sessionExpiresAt = new Date(2026, 8, 7, 18, 0).getTime();
    const text = await renderSession('fresh', expiresAt, sessionExpiresAt);
    const expected = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(expiresAt);
    const ceiling = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(sessionExpiresAt);
    expect(text).toContain('Signed in');
    expect(text).toContain('Fresh session');
    expect(text).toContain('Expires at');
    expect(text).toContain(expected);
    expect(text).not.toContain(ceiling);
    expect(text).not.toContain('Session expires by');
    expect(text).not.toContain('maximum session');
    expect(text).not.toContain('renew');
    expect(text).toContain('Version');
    expect(text).not.toContain('work-tracker-api');
    expect(text).not.toContain('API environment');
    expect(text).not.toContain('Worker password');
    expect(text).not.toContain('JWT');
  });

  it('shows an extended session and includes the date for an expiry on another day', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 22, 0));
    const expiresAt = new Date(2026, 8, 8, 11, 12).getTime();
    const text = await renderSession('extended', expiresAt, new Date(2026, 8, 9, 8, 0).getTime());
    const expected = new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(expiresAt);
    expect(text).toContain('Extended session');
    expect(text).toContain(expected);
  });
});
