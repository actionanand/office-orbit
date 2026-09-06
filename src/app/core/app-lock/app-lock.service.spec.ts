import { TestBed } from '@angular/core/testing';
import { AppLockService } from './app-lock.service';
import { NativeStorageService } from '../storage/native-storage.service';
import { PlatformService } from '../platform/platform.service';
import { BiometricService } from '../platform/biometric.service';
import { AuthState } from '../auth/auth-state';
import { createPin, parsePin } from './pin';
describe('local app lock', () => {
  const session = () => ({
    accessToken: 'test',
    expiresAt: Date.now() + 600000,
    renewAfter: Date.now() + 540000,
    sessionExpiresAt: Date.now() + 3600000,
  });
  let saved: string | null = null;
  const biometric = {
    check: vi.fn().mockResolvedValue(true),
    authenticate: vi.fn().mockResolvedValue(undefined),
  };
  beforeEach(() => {
    saved = null;
    vi.clearAllMocks();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { android: true } },
        { provide: BiometricService, useValue: biometric },
        {
          provide: NativeStorageService,
          useValue: {
            get: async () => saved,
            set: async (_key: string, value: string) => {
              saved = value;
            },
            remove: async () => {
              saved = null;
            },
          },
        },
      ],
    });
    const state = TestBed.inject(AuthState);
    state.session.set(session());
    state.verified.set(true);
  });
  it('locks at cold launch and verifies a salted PIN', async () => {
    saved = JSON.stringify(await createPin('4391'));
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    expect(lock.locked()).toBe(true);
    await lock.unlock('4391');
    expect(lock.locked()).toBe(false);
    lock.lock();
    expect(lock.locked()).toBe(true);
  });
  it('persists throttling and refuses attempts until the delay expires', async () => {
    saved = JSON.stringify({ ...(await createPin('4391')), failures: 4 });
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    await expect(lock.unlock('4392')).rejects.toThrow('wait');
    expect(parsePin(saved!).retryAt).toBeGreaterThan(Date.now());
    await expect(lock.unlock('4391')).rejects.toThrow('seconds');
    expect(lock.locked()).toBe(true);
  });
  it('requires a current PIN and successful biometric authentication to enable biometrics', async () => {
    saved = JSON.stringify(await createPin('4391'));
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    await lock.unlock('4391');
    await expect(lock.setBiometric(true, '4392')).rejects.toThrow();
    expect(biometric.authenticate).not.toHaveBeenCalled();
    await lock.setBiometric(true, '4391');
    expect(lock.biometricEnabled()).toBe(true);
  });
  it('does not unlock an expired Worker session even with a correct PIN', async () => {
    saved = JSON.stringify(await createPin('4391'));
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    TestBed.inject(AuthState).clear();
    await expect(lock.unlock('4391')).rejects.toThrow('expired');
    expect(lock.locked()).toBe(true);
  });
  it('disables local lock on web without reading native storage', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { android: false } },
        {
          provide: NativeStorageService,
          useValue: {
            get: () => {
              throw new Error('Native storage accessed on web');
            },
          },
        },
        { provide: BiometricService, useValue: biometric },
      ],
    });
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    expect(lock.enabled()).toBe(false);
    expect(lock.locked()).toBe(false);
  });
});
