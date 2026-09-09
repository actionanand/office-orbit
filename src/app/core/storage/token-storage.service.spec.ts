import { TestBed } from '@angular/core/testing';
import { StoredToken, TokenStorageService } from './token-storage.service';
import { NativeStorageService } from './native-storage.service';
import { PlatformService } from '../platform/platform.service';
import { IndexedDbStoreService } from './indexed-db-store';
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
  const indexedDb = {
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    localStorage.clear();
    indexedDb.get.mockResolvedValue(null);
    indexedDb.set.mockResolvedValue(undefined);
    indexedDb.remove.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { android: false } },
        { provide: NativeStorageService, useValue: native },
        { provide: IndexedDbStoreService, useValue: indexedDb },
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
  it('falls back to the app-private IndexedDB store when native storage fails', async () => {
    TestBed.overrideProvider(PlatformService, { useValue: { android: true } });
    const service = TestBed.inject(TokenStorageService);
    const token = session({ accessToken: 'test' });
    native.set.mockRejectedValueOnce(new Error('Device storage failed'));
    await service.save(token);
    expect(indexedDb.set).toHaveBeenCalledWith('session', JSON.stringify(token));
    indexedDb.get.mockResolvedValueOnce(JSON.stringify(token));
    native.get.mockRejectedValueOnce(new Error('Device storage failed'));
    expect(await service.read()).toEqual(token);
    expect(sessionStorage.length).toBe(0);
  });
  it('starts Android anonymously when neither native storage nor IndexedDB can restore a session', async () => {
    TestBed.overrideProvider(PlatformService, { useValue: { android: true } });
    native.get.mockRejectedValueOnce(new Error('Stored session is unreadable'));
    const service = TestBed.inject(TokenStorageService);
    await expect(service.read()).resolves.toBeNull();
    expect(sessionStorage.length).toBe(0);
  });
  it('durably saves an Android login through IndexedDB when secure storage cannot', async () => {
    TestBed.overrideProvider(PlatformService, { useValue: { android: true } });
    native.set.mockRejectedValueOnce(new Error('Device storage failed'));
    const service = TestBed.inject(TokenStorageService);
    await expect(service.save(session())).resolves.toBeUndefined();
    expect(indexedDb.set).toHaveBeenCalled();
  });
  it('reports a failed login only when native storage and IndexedDB both fail', async () => {
    TestBed.overrideProvider(PlatformService, { useValue: { android: true } });
    native.set.mockRejectedValueOnce(new Error('Device storage failed'));
    indexedDb.set.mockRejectedValueOnce(new Error('IndexedDB unavailable'));
    const service = TestBed.inject(TokenStorageService);
    await expect(service.save(session())).rejects.toThrow('IndexedDB unavailable');
  });
});
