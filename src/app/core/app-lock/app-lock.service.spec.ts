import { TestBed } from '@angular/core/testing';
import { AppLockService } from './app-lock.service';
import { PinStorageService } from '../storage/pin-storage.service';
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
    sessionKind: 'fresh' as const,
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
          provide: PinStorageService,
          useValue: {
            get: async () => saved,
            set: async (value: string) => {
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
  it('trusts a successful account sign-in without asking for the device PIN again', async () => {
    saved = JSON.stringify(await createPin('4391'));
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    expect(lock.locked()).toBe(true);
    lock.unlockAfterSignIn();
    expect(lock.locked()).toBe(false);
    expect(TestBed.inject(AuthState).localLocked()).toBe(false);
  });
  it('can reset existing device protection after account re-authentication', async () => {
    saved = JSON.stringify(await createPin('4391'));
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    await lock.resetAfterSignIn();
    expect(saved).toBeNull();
    expect(lock.enabled()).toBe(false);
    expect(lock.locked()).toBe(false);
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
  it('enters recovery for an unreadable record over a valid session', async () => {
    saved = 'not-json';
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    expect(lock.recovery()).toBe(true);
    expect(lock.locked()).toBe(true);
    expect(lock.enabled()).toBe(false);
    await lock.clearUnreadable();
    expect(saved).toBeNull();
    expect(lock.recovery()).toBe(false);
    expect(lock.locked()).toBe(false);
  });
  it('does not enter recovery for an unreadable record without a session', async () => {
    saved = 'not-json';
    TestBed.inject(AuthState).clear();
    const lock = TestBed.inject(AppLockService);
    await lock.initialize();
    expect(lock.recovery()).toBe(false);
    expect(lock.locked()).toBe(false);
    expect(lock.enabled()).toBe(false);
  });
  describe('web platform', () => {
    let webSaved: string | null;
    const configure = () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          { provide: PlatformService, useValue: { android: false } },
          { provide: BiometricService, useValue: biometric },
          {
            provide: PinStorageService,
            useValue: {
              get: async () => webSaved,
              set: async (value: string) => {
                webSaved = value;
              },
              remove: async () => {
                webSaved = null;
              },
            },
          },
        ],
      });
      const state = TestBed.inject(AuthState);
      state.session.set(session());
      state.verified.set(true);
    };
    it('supports a PIN on web and locks at cold launch', async () => {
      webSaved = JSON.stringify(await createPin('4391'));
      configure();
      const lock = TestBed.inject(AppLockService);
      await lock.initialize();
      expect(lock.enabled()).toBe(true);
      expect(lock.locked()).toBe(true);
      await lock.unlock('4391');
      expect(lock.locked()).toBe(false);
    });
    it('stays unlocked on web when no PIN is configured', async () => {
      webSaved = null;
      configure();
      const lock = TestBed.inject(AppLockService);
      await lock.initialize();
      expect(lock.enabled()).toBe(false);
      expect(lock.locked()).toBe(false);
    });
    it('sets a PIN on web without native storage and never enables biometric there', async () => {
      webSaved = null;
      configure();
      const lock = TestBed.inject(AppLockService);
      await lock.initialize();
      await lock.setPin('4391');
      expect(webSaved).not.toBeNull();
      expect(lock.enabled()).toBe(true);
      await expect(lock.setBiometric(true, '4391')).rejects.toThrow('Android');
      expect(biometric.authenticate).not.toHaveBeenCalled();
    });
  });
});
