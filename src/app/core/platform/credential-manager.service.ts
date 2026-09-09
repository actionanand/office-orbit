import { InjectionToken, Service, inject } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import { PlatformService } from './platform.service';

type NativeSaveStatus = 'saved' | 'cancelled' | 'unavailable' | 'error';
type NativeGetStatus = 'success' | 'cancelled' | 'not-found' | 'unavailable' | 'error';

export interface OfficeOrbitCredentialsPlugin {
  savePassword(options: { username: string; password: string }): Promise<{ status: NativeSaveStatus }>;
  getPassword(): Promise<{
    status: NativeGetStatus;
    username?: string;
    password?: string;
  }>;
}

export type PasswordLookupResult =
  | { status: 'success'; username: string; password: string }
  | { status: 'cancelled' | 'not-found' | 'unavailable' | 'error' };

export const OFFICE_ORBIT_CREDENTIALS = new InjectionToken<OfficeOrbitCredentialsPlugin>(
  'OfficeOrbitCredentialsPlugin',
  { factory: () => registerPlugin<OfficeOrbitCredentialsPlugin>('OfficeOrbitCredentials') },
);

@Service()
export class CredentialManagerService {
  private readonly platform = inject(PlatformService);
  private readonly nativeCredentials = inject(OFFICE_ORBIT_CREDENTIALS);

  async savePassword(username: string, password: string): Promise<void> {
    if (this.platform.android) {
      try {
        await this.nativeCredentials.savePassword({ username, password });
      } catch {
        // Saving is an optional convenience and must never prevent a successful login.
      }
      return;
    }

    await this.offerBrowserPasswordSave(username, password);
  }

  async getPassword(): Promise<PasswordLookupResult> {
    if (!this.platform.android) return { status: 'unavailable' };

    try {
      const result = await this.nativeCredentials.getPassword();
      if (result.status !== 'success') return { status: result.status };
      if (!result.username || !result.password) return { status: 'error' };
      return { status: 'success', username: result.username, password: result.password };
    } catch {
      return { status: 'error' };
    }
  }

  private async offerBrowserPasswordSave(username: string, password: string): Promise<void> {
    const PasswordCredentialCtor = (
      window as unknown as { PasswordCredential?: new (data: Record<string, string>) => Credential }
    ).PasswordCredential;
    const container = navigator.credentials as
      (CredentialsContainer & { store?: (credential: Credential) => Promise<void> }) | undefined;
    if (!PasswordCredentialCtor || !container?.store) return;

    try {
      await container.store(new PasswordCredentialCtor({ id: username, password, name: username }));
    } catch {
      // Browser password-manager support and user consent are optional.
    }
  }
}
