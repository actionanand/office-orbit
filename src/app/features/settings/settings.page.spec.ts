import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthService } from '../../core/auth/auth.service';
import { BiometricService } from '../../core/platform/biometric.service';
import { PlatformService } from '../../core/platform/platform.service';
import { ThemeService } from '../../core/theme/theme.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  afterEach(() => {
    vi.useRealTimers();
    localStorage.removeItem('office-orbit.time-format');
    localStorage.removeItem('office-orbit.show-remaining-time');
  });

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
        { provide: AuthService, useValue: { signOut: vi.fn(), state: { session, notice: signal('') } } },
        {
          provide: AppLockService,
          useValue: {
            enabled: signal(false),
            biometricEnabled: signal(false),
            lockAfterMinutes: signal(0),
            setPin: vi.fn(),
            disable: vi.fn(),
            setBiometric: vi.fn(),
            setLockAfterMinutes: vi.fn(),
            lock: vi.fn(),
          },
        },
        { provide: BiometricService, useValue: { available: signal(false) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  async function renderWithPin() {
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: ThemeService, useValue: { mode: signal('system'), set: vi.fn() } },
        { provide: PlatformService, useValue: { android: false, label: 'Web' } },
        { provide: AuthService, useValue: { signOut: vi.fn(), state: { session: signal(null), notice: signal('') } } },
        {
          provide: AppLockService,
          useValue: {
            enabled: signal(true),
            biometricEnabled: signal(false),
            lockAfterMinutes: signal(0),
            setPin: vi.fn(),
            disable: vi.fn(),
            setBiometric: vi.fn(),
            setLockAfterMinutes: vi.fn(),
            lock: vi.fn(),
          },
        },
        { provide: BiometricService, useValue: { available: signal(false) } },
      ],
    }).compileComponents();
    return TestBed.createComponent(SettingsPage);
  }

  it('shows a fresh session with the actual same-day token expiry and no ceiling explanation', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 10, 0));
    const expiresAt = new Date(2026, 8, 7, 11, 12).getTime();
    const sessionExpiresAt = new Date(2026, 8, 7, 18, 0).getTime();
    const text = await renderSession('fresh', expiresAt, sessionExpiresAt);
    const expected = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(
      expiresAt,
    );
    const ceiling = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(
      sessionExpiresAt,
    );
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
      hour12: true,
    }).format(expiresAt);
    expect(text).toContain('Extended session');
    expect(text).toContain(expected);
  });

  it('defaults to 12-hour time and switches to 24-hour when chosen', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 10, 0));
    const expiresAt = new Date(2026, 8, 7, 14, 22).getTime();
    localStorage.removeItem('office-orbit.time-format');
    const fixture = await (async () => {
      const session = signal({
        accessToken: 'hidden',
        expiresAt,
        renewAfter: Date.now() + 45000,
        sessionExpiresAt: expiresAt,
        sessionKind: 'fresh' as const,
      });
      await TestBed.configureTestingModule({
        imports: [SettingsPage],
        providers: [
          { provide: ThemeService, useValue: { mode: signal('system'), set: vi.fn() } },
          { provide: PlatformService, useValue: { android: false, label: 'Web' } },
          { provide: AuthService, useValue: { signOut: vi.fn(), state: { session, notice: signal('') } } },
          {
            provide: AppLockService,
            useValue: {
              enabled: signal(false),
              biometricEnabled: signal(false),
              lockAfterMinutes: signal(0),
              setPin: vi.fn(),
              disable: vi.fn(),
              setBiometric: vi.fn(),
              setLockAfterMinutes: vi.fn(),
              lock: vi.fn(),
            },
          },
          { provide: BiometricService, useValue: { available: signal(false) } },
        ],
      }).compileComponents();
      const created = TestBed.createComponent(SettingsPage);
      created.detectChanges();
      return created;
    })();
    const twelveHour = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit', hour12: true }).format(
      expiresAt,
    );
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(twelveHour);
    fixture.componentInstance.setTimeFormat('24');
    fixture.detectChanges();
    const twentyFourHour = new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    }).format(expiresAt);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(twentyFourHour);
    localStorage.removeItem('office-orbit.time-format');
  });

  it('hides remaining time by default and shows it once toggled on', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 10, 0));
    const expiresAt = new Date(2026, 8, 7, 12, 3).getTime();
    localStorage.removeItem('office-orbit.show-remaining-time');
    const text = await renderSession('fresh', expiresAt, expiresAt);
    expect(text).not.toContain('left');
  });

  it('shows remaining time inside brackets once the toggle is turned on', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 7, 10, 0));
    const expiresAt = new Date(2026, 8, 7, 12, 3).getTime();
    localStorage.removeItem('office-orbit.show-remaining-time');
    const session = signal({
      accessToken: 'hidden',
      expiresAt,
      renewAfter: Date.now() + 45000,
      sessionExpiresAt: expiresAt,
      sessionKind: 'fresh' as const,
    });
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: ThemeService, useValue: { mode: signal('system'), set: vi.fn() } },
        { provide: PlatformService, useValue: { android: false, label: 'Web' } },
        { provide: AuthService, useValue: { signOut: vi.fn(), state: { session, notice: signal('') } } },
        {
          provide: AppLockService,
          useValue: {
            enabled: signal(false),
            biometricEnabled: signal(false),
            lockAfterMinutes: signal(0),
            setPin: vi.fn(),
            disable: vi.fn(),
            setBiometric: vi.fn(),
            setLockAfterMinutes: vi.fn(),
            lock: vi.fn(),
          },
        },
        { provide: BiometricService, useValue: { available: signal(false) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    fixture.componentInstance.setShowRemainingTime(true);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('(2 hours 3 minutes left)');
    localStorage.removeItem('office-orbit.show-remaining-time');
  });

  it('offers an automatic-lock timeout and an immediate lock action once a PIN is set', async () => {
    const fixture = await renderWithPin();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const lock = TestBed.inject(AppLockService);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(fixture.nativeElement.querySelector('ion-select')).toBeTruthy();
    expect(text).toContain('Lock now');
    page.lockNow();
    expect(lock.lock).toHaveBeenCalledOnce();
  });
});
