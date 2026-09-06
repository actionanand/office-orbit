import { TestBed } from '@angular/core/testing';
import { StartupService } from './startup.service';
import { AuthService } from './auth/auth.service';
import { AppLockService } from './app-lock/app-lock.service';
import { PlatformService } from './platform/platform.service';
import { BiometricService } from './platform/biometric.service';
import { ThemeService } from './theme/theme.service';
import { Router } from '@angular/router';
import { signal } from '@angular/core';
describe('deterministic startup', () => {
  const verified = signal(false);
  const auth = {
    restore: vi.fn().mockResolvedValue(undefined),
    installActivityTracking: vi.fn(),
    setForeground: vi.fn(),
    evaluateRenewal: vi.fn().mockResolvedValue(undefined),
    signOut: vi.fn().mockResolvedValue(undefined),
    state: { verified, valid: vi.fn(() => true) },
  };
  const lock = { initialize: vi.fn().mockResolvedValue(undefined), lock: vi.fn(), enabled: vi.fn(() => false) };
  beforeEach(() => {
    vi.clearAllMocks();
    auth.restore.mockResolvedValue(undefined);
    auth.state.valid.mockReturnValue(true);
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
});
