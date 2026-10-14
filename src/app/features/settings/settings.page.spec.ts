import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AlertController } from '@ionic/angular';
import { of } from 'rxjs';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthService } from '../../core/auth/auth.service';
import { BiometricService } from '../../core/platform/biometric.service';
import { PlatformService } from '../../core/platform/platform.service';
import { ThemeService } from '../../core/theme/theme.service';
import { SessionManagementService } from '../../core/auth/session-management.service';
import { SettingsPage } from './settings.page';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import type { ToggleChangeEventDetail } from '@ionic/core/components';

let controlsMock: ReturnType<typeof createControlsMock>;

function createControlsMock() {
  return {
    refresh: vi.fn().mockResolvedValue(null),
    refreshFresh: vi.fn().mockResolvedValue(null),
    setControl: vi.fn().mockResolvedValue(null),
    loading: signal(false),
    error: signal(''),
    state: signal(null),
    alterSprintEnabled: signal(false),
    alterReleaseManagementEnabled: signal(false),
    sprintActiveUntil: signal<string | null>(null),
    releaseActiveUntil: signal<string | null>(null),
  };
}

describe('SettingsPage', () => {
  beforeEach(() => {
    controlsMock = createControlsMock();
    TestBed.configureTestingModule({
      providers: [
        {
          provide: AlterControlsService,
          useValue: controlsMock,
        },
      ],
    });
  });
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

  async function prepareFailedControlToggle(initialEnabled: boolean, backendEnabled: boolean, refreshFails = false) {
    const fixture = await renderWithPin();
    const activeUntil = '2026-10-14T08:30:00.000Z';
    controlsMock.alterSprintEnabled.set(initialEnabled);
    controlsMock.sprintActiveUntil.set(initialEnabled ? activeUntil : null);
    fixture.detectChanges();
    controlsMock.setControl.mockRejectedValueOnce(new Error('PATCH response lost'));
    controlsMock.refreshFresh.mockClear();
    if (refreshFails) {
      controlsMock.refreshFresh.mockRejectedValueOnce(new Error('GET failed'));
    } else {
      controlsMock.refreshFresh.mockImplementationOnce(async () => {
        controlsMock.alterSprintEnabled.set(backendEnabled);
        controlsMock.sprintActiveUntil.set(backendEnabled ? activeUntil : null);
        return null;
      });
    }
    return {
      fixture,
      page: fixture.componentInstance,
      confirmation: TestBed.inject(ConfirmationService),
    };
  }

  async function prepareEnabledSprint() {
    const fixture = await renderWithPin();
    controlsMock.alterSprintEnabled.set(true);
    controlsMock.sprintActiveUntil.set('2026-10-14T08:30:00.000Z');
    fixture.detectChanges();
    return fixture;
  }

  function dispatchToggleChange(
    fixture: Awaited<ReturnType<typeof renderWithPin>>,
    control: 'sprint' | 'releaseManagement',
    checked: boolean,
  ) {
    const toggleId = control === 'sprint' ? '#alter-sprint-toggle' : '#alter-release-toggle';
    const toggle = fixture.nativeElement.querySelector(toggleId) as HTMLIonToggleElement | null;
    if (!toggle) throw new Error(`Missing toggle: ${toggleId}`);
    const currentlyEnabled =
      control === 'sprint'
        ? fixture.componentInstance.alterControls.alterSprintEnabled()
        : fixture.componentInstance.alterControls.alterReleaseManagementEnabled();
    expect(toggle.checked).toBe(currentlyEnabled);
    const handler = vi.spyOn(fixture.componentInstance, 'onAlterControlToggle');
    toggle.checked = checked;
    toggle.dispatchEvent(
      new CustomEvent<ToggleChangeEventDetail<boolean>>('ionChange', {
        bubbles: true,
        detail: { checked, value: checked },
      }),
    );
    const result = handler.mock.results[0];
    if (!result || result.type !== 'return') throw new Error('Toggle handler did not complete');
    return { toggle, pending: result.value };
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

  it('reverts the PIN protection toggle to on after cancelling a disable attempt', async () => {
    const fixture = await renderWithPin();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    expect(page.pinProtectionChecked()).toBe(true);
    page.onPinProtectionToggle(false);
    expect(page.pinProtectionChecked()).toBe(false);
    page.cancelSecurityAction();
    expect(page.pinProtectionChecked()).toBe(true);
  });

  it('keeps the Sprint toggle off while confirmation is open and after cancellation', async () => {
    const fixture = await renderWithPin();
    fixture.detectChanges();
    const page = fixture.componentInstance;
    const controls = TestBed.inject(AlterControlsService);
    const confirmation = TestBed.inject(ConfirmationService);

    const { toggle, pending } = dispatchToggleChange(fixture, 'sprint', true);
    expect(confirmation.current()?.title).toBe('Enable Alter Sprint?');
    expect(confirmation.current()?.confirmLabel).toBe('Enable for 30 minutes');
    expect(toggle.checked).toBe(false);
    confirmation.settle(false);
    await pending;
    fixture.detectChanges();
    expect(toggle.checked).toBe(false);
    expect(controls.setControl).not.toHaveBeenCalled();
    expect(page.alterSprintChecked()).toBe(false);
  });

  it('keeps the Release Management toggle off after cancelling confirmation', async () => {
    const fixture = await renderWithPin();
    fixture.detectChanges();
    const controls = TestBed.inject(AlterControlsService);
    const confirmation = TestBed.inject(ConfirmationService);

    const { toggle, pending } = dispatchToggleChange(fixture, 'releaseManagement', true);
    expect(confirmation.current()?.title).toBe('Enable Alter Release Management?');
    expect(toggle.checked).toBe(false);
    confirmation.settle(false);
    await pending;
    fixture.detectChanges();

    expect(toggle.checked).toBe(false);
    expect(controls.setControl).not.toHaveBeenCalled();
  });

  it('enables the Sprint toggle only after confirmation and a successful PATCH', async () => {
    const fixture = await renderWithPin();
    fixture.detectChanges();
    const confirmation = TestBed.inject(ConfirmationService);
    const expiry = '2026-10-14T08:30:00.000Z';
    controlsMock.setControl.mockImplementationOnce(async () => {
      controlsMock.alterSprintEnabled.set(true);
      controlsMock.sprintActiveUntil.set(expiry);
      return null;
    });

    const { toggle, pending } = dispatchToggleChange(fixture, 'sprint', true);
    expect(toggle.checked).toBe(false);
    confirmation.settle(true);
    await pending;
    fixture.detectChanges();

    expect(controlsMock.setControl).toHaveBeenCalledOnce();
    expect(toggle.checked).toBe(true);
  });

  it('keeps an enabled Sprint toggle on until a successful disable PATCH', async () => {
    const fixture = await prepareEnabledSprint();
    let completePatch!: () => void;
    controlsMock.setControl.mockImplementationOnce(
      () =>
        new Promise(resolve => {
          completePatch = () => {
            controlsMock.alterSprintEnabled.set(false);
            controlsMock.sprintActiveUntil.set(null);
            resolve(null);
          };
        }),
    );

    const { toggle, pending } = dispatchToggleChange(fixture, 'sprint', false);
    expect(toggle.checked).toBe(true);
    expect(controlsMock.setControl).toHaveBeenCalledWith('sprint', false);
    completePatch();
    await pending;
    fixture.detectChanges();

    expect(toggle.checked).toBe(false);
  });

  it('reconciles a failed enable to Sprint enabled and its backend expiry', async () => {
    const { fixture, page, confirmation } = await prepareFailedControlToggle(false, true);

    const { toggle, pending } = dispatchToggleChange(fixture, 'sprint', true);
    expect(toggle.checked).toBe(false);
    confirmation.settle(true);
    await pending;

    fixture.detectChanges();
    expect(toggle.checked).toBe(true);
    expect(page.alterSprintChecked()).toBe(true);
    expect(page.alterControls.sprintActiveUntil()).toBe('2026-10-14T08:30:00.000Z');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(page.activeTill('2026-10-14T08:30:00.000Z'));
    expect(controlsMock.setControl).toHaveBeenCalledOnce();
    expect(controlsMock.refreshFresh).toHaveBeenCalledOnce();
  });

  it('reconciles a failed enable to Sprint disabled', async () => {
    const { fixture, page, confirmation } = await prepareFailedControlToggle(false, false);

    const { toggle, pending } = dispatchToggleChange(fixture, 'sprint', true);
    expect(toggle.checked).toBe(false);
    confirmation.settle(true);
    await pending;

    fixture.detectChanges();
    expect(toggle.checked).toBe(false);
    expect(page.alterSprintChecked()).toBe(false);
    expect(controlsMock.setControl).toHaveBeenCalledOnce();
    expect(controlsMock.refreshFresh).toHaveBeenCalledOnce();
  });

  it('reconciles a failed disable to Sprint disabled', async () => {
    const { fixture, page } = await prepareFailedControlToggle(true, false);

    const { toggle, pending } = dispatchToggleChange(fixture, 'sprint', false);
    expect(toggle.checked).toBe(true);
    await pending;
    fixture.detectChanges();

    expect(toggle.checked).toBe(false);
    expect(page.alterSprintChecked()).toBe(false);
    expect(controlsMock.setControl).toHaveBeenCalledOnce();
    expect(controlsMock.refreshFresh).toHaveBeenCalledOnce();
  });

  it('reconciles a failed disable to Sprint still enabled', async () => {
    const { fixture, page } = await prepareFailedControlToggle(true, true);

    const { toggle, pending } = dispatchToggleChange(fixture, 'sprint', false);
    expect(toggle.checked).toBe(true);
    await pending;
    fixture.detectChanges();

    expect(toggle.checked).toBe(true);
    expect(page.alterSprintChecked()).toBe(true);
    expect(controlsMock.setControl).toHaveBeenCalledOnce();
    expect(controlsMock.refreshFresh).toHaveBeenCalledOnce();
  });

  it('retains the known state and reports when reconciliation also fails', async () => {
    const { fixture, page } = await prepareFailedControlToggle(true, true, true);
    const snackbar = TestBed.inject(SnackbarService);
    const error = vi.spyOn(snackbar, 'error');

    const { toggle, pending } = dispatchToggleChange(fixture, 'sprint', false);
    await pending;
    fixture.detectChanges();

    expect(toggle.checked).toBe(true);
    expect(page.alterSprintChecked()).toBe(true);
    expect(page.alterControls.sprintActiveUntil()).toBe('2026-10-14T08:30:00.000Z');
    expect(controlsMock.setControl).toHaveBeenCalledOnce();
    expect(controlsMock.refreshFresh).toHaveBeenCalledOnce();
    expect(error).toHaveBeenCalledWith(expect.stringContaining('Unable to confirm the current managed-control state'));
  });

  it('does not request active sessions until the user explicitly opens the modal', async () => {
    const listActiveSessions = vi.fn(() => of({ sessions: [] }));
    const signOutCurrentSession = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: ThemeService, useValue: { mode: signal('system'), set: vi.fn() } },
        { provide: PlatformService, useValue: { android: false, label: 'Web' } },
        {
          provide: AuthService,
          useValue: { signOutCurrentSession, signOut: vi.fn(), state: { session: signal(null), notice: signal('') } },
        },
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
        {
          provide: SessionManagementService,
          useValue: { listActiveSessions, revokeSession: vi.fn(), revokeOtherSessions: vi.fn() },
        },
        {
          provide: AlertController,
          useValue: { create: vi.fn() },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    expect(listActiveSessions).not.toHaveBeenCalled();

    fixture.componentInstance.sessionsOpen.set(true);
    fixture.detectChanges();
    expect(listActiveSessions).toHaveBeenCalledOnce();

    await fixture.componentInstance.signOut();
    expect(signOutCurrentSession).toHaveBeenCalledOnce();
  });
});
