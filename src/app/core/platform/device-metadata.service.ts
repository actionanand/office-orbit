import { InjectionToken, Service, inject } from '@angular/core';
import { Device, type DeviceInfo } from '@capacitor/device';
import { appVersion } from '../version/app-version';
import { NativeStorageService } from '../storage/native-storage.service';
import { PlatformService } from './platform.service';

export interface LoginDeviceMetadata {
  deviceId: string;
  name: string;
  platform: 'android' | 'web' | 'ios' | 'desktop' | 'unknown';
  model: string | null;
  appVersion: string;
}

interface DeviceInfoProvider {
  getInfo(): Promise<DeviceInfo>;
}

export const DEVICE_INFO = new InjectionToken<DeviceInfoProvider>('CapacitorDeviceInfo', {
  factory: () => Device,
});

const DEVICE_ID_KEY = 'office-orbit.device-id';

@Service()
export class DeviceMetadataService {
  private readonly platform = inject(PlatformService);
  private readonly nativeStorage = inject(NativeStorageService);
  private readonly deviceInfo = inject(DEVICE_INFO);
  private deviceId?: Promise<string>;

  async getLoginMetadata(): Promise<LoginDeviceMetadata> {
    const deviceId = await (this.deviceId ??= this.loadDeviceId());
    if (!this.platform.android) {
      return { deviceId, name: this.webName(), platform: 'web', model: null, appVersion };
    }

    try {
      const info = await this.deviceInfo.getInfo();
      const manufacturer = this.clean(info.manufacturer);
      const model = this.clean(info.model);
      const name = [this.titleCase(manufacturer), model].filter(Boolean).join(' ') || 'Android device';
      return { deviceId, name, platform: 'android', model: model || null, appVersion };
    } catch {
      return { deviceId, name: 'Android device', platform: 'android', model: null, appVersion };
    }
  }

  private async loadDeviceId(): Promise<string> {
    if (this.platform.android) {
      try {
        const saved = await this.nativeStorage.get('installation-id');
        if (saved) {
          this.writeLocalId(saved);
          return saved;
        }
      } catch {
        // Continue with the app-private WebView fallback so login is never blocked.
      }
    }

    const fallback = this.readLocalId();
    if (fallback) {
      if (this.platform.android) await this.persistNative(fallback);
      return fallback;
    }

    const created = this.createId();
    this.writeLocalId(created);
    if (this.platform.android) await this.persistNative(created);
    return created;
  }

  private async persistNative(value: string): Promise<void> {
    try {
      await this.nativeStorage.set('installation-id', value);
    } catch {
      // The local fallback already preserves this non-secret installation ID.
    }
  }

  private readLocalId(): string | null {
    try {
      return localStorage.getItem(DEVICE_ID_KEY);
    } catch {
      return null;
    }
  }

  private writeLocalId(value: string): void {
    try {
      localStorage.setItem(DEVICE_ID_KEY, value);
    } catch {
      // A storage-restricted browser may receive a new ID after a full reload.
    }
  }

  private createId(): string {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  private webName(): string {
    const userAgent = navigator.userAgent;
    const browser = /Edg\//.test(userAgent)
      ? 'Edge'
      : /Firefox\//.test(userAgent)
        ? 'Firefox'
        : /Chrome\//.test(userAgent)
          ? 'Chrome'
          : /Safari\//.test(userAgent)
            ? 'Safari'
            : '';
    const operatingSystem = /Windows/.test(userAgent)
      ? 'Windows'
      : /Android/.test(userAgent)
        ? 'Android'
        : /iPhone|iPad|iPod/.test(userAgent)
          ? 'iOS'
          : /Mac OS X/.test(userAgent)
            ? 'macOS'
            : /Linux/.test(userAgent)
              ? 'Linux'
              : '';
    return browser && operatingSystem ? `${browser} on ${operatingSystem}` : browser || 'Web browser';
  }

  private clean(value: string | undefined): string {
    return value?.trim() ?? '';
  }

  private titleCase(value: string): string {
    return value ? value.charAt(0).toUpperCase() + value.slice(1) : '';
  }
}
