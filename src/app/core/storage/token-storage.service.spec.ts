import { TestBed } from '@angular/core/testing';
import { StoredToken, TokenStorageService } from './token-storage.service';
import { NativeStorageService } from './native-storage.service';
import { PlatformService } from '../platform/platform.service';
describe('TokenStorageService', () => {
  const session = (overrides: Partial<StoredToken> = {}): StoredToken => ({
    accessToken: 'test-access-token',
    expiresAt: Date.now() + 60000,
    renewAfter: Date.now() + 45000,
    sessionExpiresAt: Date.now() + 600000,
    sessionKind: 'fresh',
    ...overrides,
  });
  const native = {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { android: false } },
        { provide: NativeStorageService, useValue: native },
      ],
    });
  });
  it('uses only sessionStorage on web', async () => {
    const service = TestBed.inject(TokenStorageService);
    const token = session();
    await service.save(token);
    expect(await service.read()).toEqual(token);
    expect(localStorage.length).toBe(0);
    expect(native.set).not.toHaveBeenCalled();
    await service.clear();
    expect(await service.read()).toBeNull();
  });
  it('defaults legacy stored sessions to fresh', async () => {
    const service = TestBed.inject(TokenStorageService);
    const { sessionKind: _sessionKind, ...legacy } = session();
    sessionStorage.setItem('office-orbit.session', JSON.stringify(legacy));
    expect((await service.read())?.sessionKind).toBe('fresh');
  });
  it('persists an extended session kind', async () => {
    const service = TestBed.inject(TokenStorageService);
    await service.save(session({ sessionKind: 'extended' }));
    expect((await service.read())?.sessionKind).toBe('extended');
  });
  it('discards expired and corrupt sessions', async () => {
    const service = TestBed.inject(TokenStorageService);
    sessionStorage.setItem('office-orbit.session', 'bad json');
    expect(await service.read()).toBeNull();
    await service.save(session({ accessToken: 'expired', expiresAt: 0 }));
    expect(await service.read()).toBeNull();
  });
  it('keeps the current Android session in memory when native storage fails', async () => {
    TestBed.overrideProvider(PlatformService, { useValue: { android: true } });
    const service = TestBed.inject(TokenStorageService);
    const token = session({ accessToken: 'test' });
    await service.save(token);
    expect(native.set).toHaveBeenCalled();
    expect(sessionStorage.length).toBe(0);
    native.get.mockRejectedValueOnce(new Error('Device storage failed'));
    expect(await service.read()).toEqual(token);
    expect(sessionStorage.length).toBe(0);
  });
  it('starts Android anonymously when native storage cannot restore a session', async () => {
    TestBed.overrideProvider(PlatformService, { useValue: { android: true } });
    native.get.mockRejectedValueOnce(new Error('Stored session is unreadable'));
    const service = TestBed.inject(TokenStorageService);
    await expect(service.read()).resolves.toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it('does not report an Android login as durable when secure storage cannot save it', async () => {
    TestBed.overrideProvider(PlatformService, { useValue: { android: true } });
    native.set.mockRejectedValueOnce(new Error('Device storage failed'));
    const service = TestBed.inject(TokenStorageService);
    await expect(service.save(session())).rejects.toThrow('Device storage failed');
  });
});
