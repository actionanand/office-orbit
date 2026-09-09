import { TestBed } from '@angular/core/testing';
import {
  CredentialManagerService,
  OFFICE_ORBIT_CREDENTIALS,
  OfficeOrbitCredentialsPlugin,
} from './credential-manager.service';
import { PlatformService } from './platform.service';

describe('CredentialManagerService', () => {
  const nativeCredentials: OfficeOrbitCredentialsPlugin = {
    savePassword: vi.fn().mockResolvedValue({ status: 'saved' }),
    getPassword: vi.fn().mockResolvedValue({ status: 'success', username: 'owner', password: 'secret' }),
  };

  afterEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    TestBed.resetTestingModule();
  });

  function service(android: boolean): CredentialManagerService {
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { android } },
        { provide: OFFICE_ORBIT_CREDENTIALS, useValue: nativeCredentials },
      ],
    });
    return TestBed.inject(CredentialManagerService);
  }

  it('uses the native provider to save and retrieve passwords on Android', async () => {
    const credentials = service(true);
    await credentials.savePassword('owner', 'secret');
    const result = await credentials.getPassword();

    expect(nativeCredentials.savePassword).toHaveBeenCalledWith({ username: 'owner', password: 'secret' });
    expect(result).toEqual({ status: 'success', username: 'owner', password: 'secret' });
  });

  it('normalizes native failures without exposing their details', async () => {
    vi.mocked(nativeCredentials.getPassword).mockRejectedValueOnce(new Error('provider internals'));
    expect(await service(true).getPassword()).toEqual({ status: 'error' });
  });

  it('treats save cancellation as a successful no-op', async () => {
    vi.mocked(nativeCredentials.savePassword).mockResolvedValueOnce({ status: 'cancelled' });
    await expect(service(true).savePassword('owner', 'secret')).resolves.toBeUndefined();
  });

  it('never invokes the native plugin on web', async () => {
    const credentials = service(false);
    await credentials.savePassword('owner', 'secret');
    expect(await credentials.getPassword()).toEqual({ status: 'unavailable' });
    expect(nativeCredentials.savePassword).not.toHaveBeenCalled();
    expect(nativeCredentials.getPassword).not.toHaveBeenCalled();
  });
});
