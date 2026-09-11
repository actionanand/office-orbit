import { TestBed } from '@angular/core/testing';
import type { DeviceInfo } from '@capacitor/device';
import { NativeStorageService } from '../storage/native-storage.service';
import { appVersion } from '../version/app-version';
import { DEVICE_INFO, DeviceMetadataService } from './device-metadata.service';
import { PlatformService } from './platform.service';

describe('DeviceMetadataService', () => {
  const nativeStorage = {
    get: vi.fn(),
    set: vi.fn().mockResolvedValue(undefined),
  };
  const deviceInfo = {
    getInfo: vi.fn().mockResolvedValue({
      manufacturer: 'samsung',
      model: 'SM-S921B',
      platform: 'android',
    } as DeviceInfo),
  };

  function service(android: boolean): DeviceMetadataService {
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { android } },
        { provide: NativeStorageService, useValue: nativeStorage },
        { provide: DEVICE_INFO, useValue: deviceInfo },
      ],
    });
    return TestBed.inject(DeviceMetadataService);
  }

  beforeEach(() => {
    localStorage.removeItem('office-orbit.device-id');
    vi.clearAllMocks();
    nativeStorage.set.mockResolvedValue(undefined);
  });

  afterEach(() => TestBed.resetTestingModule());

  it('persists and reuses one browser installation ID', async () => {
    const firstService = service(false);
    const first = await firstService.getLoginMetadata();
    const second = await firstService.getLoginMetadata();
    expect(first.deviceId).toBe(second.deviceId);
    expect(localStorage.getItem('office-orbit.device-id')).toBe(first.deviceId);
    expect(first.platform).toBe('web');
    expect(first.appVersion).toBe(appVersion);
    expect(nativeStorage.get).not.toHaveBeenCalled();

    TestBed.resetTestingModule();
    expect((await service(false).getLoginMetadata()).deviceId).toBe(first.deviceId);
  });

  it('uses the secure installation ID and Android device information', async () => {
    nativeStorage.get.mockResolvedValueOnce('stable-native-id');
    const metadata = await service(true).getLoginMetadata();
    expect(nativeStorage.get).toHaveBeenCalledWith('installation-id');
    expect(metadata).toEqual({
      deviceId: 'stable-native-id',
      name: 'Samsung SM-S921B',
      platform: 'android',
      model: 'SM-S921B',
      appVersion,
    });
  });

  it('persists a generated Android ID through native storage', async () => {
    nativeStorage.get.mockResolvedValueOnce(null);
    const metadata = await service(true).getLoginMetadata();
    expect(nativeStorage.set).toHaveBeenCalledWith('installation-id', metadata.deviceId);
    expect(localStorage.getItem('office-orbit.device-id')).toBe(metadata.deviceId);
  });

  it('uses safe Android fallbacks when optional device information and native storage fail', async () => {
    nativeStorage.get.mockRejectedValueOnce(new Error('unavailable'));
    nativeStorage.set.mockRejectedValueOnce(new Error('unavailable'));
    deviceInfo.getInfo.mockRejectedValueOnce(new Error('unavailable'));
    const metadata = await service(true).getLoginMetadata();
    expect(metadata.name).toBe('Android device');
    expect(metadata.model).toBeNull();
    expect(metadata.deviceId).toBeTruthy();
  });
});
