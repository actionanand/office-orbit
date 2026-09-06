import { TestBed } from '@angular/core/testing';
import { TokenStorageService } from './token-storage.service';
import { NativeStorageService } from './native-storage.service';
import { PlatformService } from '../platform/platform.service';
describe('TokenStorageService', () => {
  const session = (overrides: Partial<Parameters<TokenStorageService['save']>[0]> = {}) => ({
    accessToken: 'test-access-token',
    expiresAt: Date.now() + 60000,
    renewAfter: Date.now() + 45000,
    sessionExpiresAt: Date.now() + 600000,
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
});
