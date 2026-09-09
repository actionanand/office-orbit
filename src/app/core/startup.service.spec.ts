import { TestBed } from '@angular/core/testing';
import { StartupService } from './startup.service';
import { AuthService } from './auth/auth.service';
import { AppLockService } from './app-lock/app-lock.service';
import { PlatformService } from './platform/platform.service';
import { BiometricService } from './platform/biometric.service';
import { ThemeService } from './theme/theme.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
import { App } from '@capacitor/app';
vi.mock('@capacitor/app', () => ({ App: { addListener: vi.fn() } }));
describe('deterministic startup', () => {
  const verified = signal(false);
  const auth = {
    restore: vi.fn().mockResolvedValue(undefined),
    installActivityTracking: vi.fn(),
    setForeground: vi.fn(),
    evaluateRenewal: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    state: { verified, valid: vi.fn(() => true), session: vi.fn(() => null as unknown) },
  };
  const lock = {
    initialize: vi.fn().mockResolvedValue(undefined),
    lock: vi.fn(),
    enabled: vi.fn(() => false),
    recovery: vi.fn(() => false),
    clearUnreadable: vi.fn().mockResolvedValue(undefined),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    auth.restore.mockResolvedValue(undefined);
    auth.state.valid.mockReturnValue(true);
    lock.recovery.mockReturnValue(false);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AppLockService, useValue: lock },
        { provide: PlatformService, useValue: { android: false } },
        { provide: BiometricService, useValue: { prompting: vi.fn(() => false) } },
        { provide: ThemeService, useValue: {} },
        { provide: Router, useValue: {} },
      ],
    });
  });
  it('shares one initialization and stays loading until restoration completes', async () => {
    let release!: () => void;
    auth.restore.mockReturnValueOnce(new Promise<void>(resolve => (release = resolve)));
    const startup = TestBed.inject(StartupService);
    const first = startup.start();
    const second = startup.start();
    expect(first).toBe(second);
    await Promise.resolve();
    expect(startup.phase()).toBe('loading');
    release();
    await first;
    expect(startup.phase()).toBe('ready');
    expect(auth.restore).toHaveBeenCalledOnce();
  });
  it('fails closed on startup errors and permits an explicit retry', async () => {
    auth.restore.mockRejectedValueOnce(new Error('offline'));
    const startup = TestBed.inject(StartupService);
    await startup.start();
    expect(startup.phase()).toBe('error');
    expect(verified()).toBe(false);
    await startup.retry();
    expect(startup.phase()).toBe('ready');
    expect(auth.installActivityTracking).toHaveBeenCalledOnce();
  });
  it('fails closed when a native startup operation never settles', async () => {
    vi.useFakeTimers();
    auth.restore.mockReturnValueOnce(new Promise<void>(() => {}));
    const startup = TestBed.inject(StartupService);
    const result = startup.start();
    await vi.advanceTimersByTimeAsync(20_000);
    await result;
    expect(startup.phase()).toBe('error');
    vi.useRealTimers();
  });
  it('lets an unauthenticated user reach sign-in when startup fails', async () => {
    auth.restore.mockRejectedValueOnce(new Error('offline'));
    auth.state.valid.mockReturnValue(false);
    const startup = TestBed.inject(StartupService);
    await startup.start();
    expect(startup.phase()).toBe('ready');
    expect(startup.reason()).toBe('network');
  });
  it('recovers safely from an unreadable local protection record', async () => {
    lock.recovery.mockReturnValue(true);
    const startup = TestBed.inject(StartupService);
    await startup.start();
    expect(lock.clearUnreadable).toHaveBeenCalledOnce();
    expect(auth.signOut).toHaveBeenCalledOnce();
    expect(startup.phase()).toBe('ready');
  });
  describe('Android resume behavior', () => {
    beforeEach(() => {
      vi.mocked(App.addListener).mockResolvedValue({ remove: async () => undefined });
      TestBed.overrideProvider(PlatformService, { useValue: { android: true } });
    });
    it('does not sign out on resume when there was never a session', async () => {
      auth.state.valid.mockReturnValue(false);
      auth.state.session.mockReturnValue(null);
      const startup = TestBed.inject(StartupService);
      await startup.start();
      const onStateChange = vi.mocked(App.addListener).mock.calls[0][1] as (state: { isActive: boolean }) => void;
      onStateChange({ isActive: true });
      expect(auth.signOut).not.toHaveBeenCalled();
    });
    it('signs out on resume when a previously valid session has expired', async () => {
      auth.state.valid.mockReturnValue(false);
      auth.state.session.mockReturnValue({ accessToken: 'stale' });
      const startup = TestBed.inject(StartupService);
      await startup.start();
      const onStateChange = vi.mocked(App.addListener).mock.calls[0][1] as (state: { isActive: boolean }) => void;
      onStateChange({ isActive: true });
      expect(auth.signOut).toHaveBeenCalledOnce();
    });
  });
});
