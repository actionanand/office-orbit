import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthState } from '../../core/auth/auth-state';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { LinksService } from '../../core/platform/links.service';
import { CredentialCryptoService } from './credential-crypto.service';
import { CredentialsPage } from './credentials.page';
import { CredentialVaultApiService, CredentialVaultSessionService } from './credential-vault.service';

describe('CredentialsPage', () => {
  const metadata = { initialized: false } as const;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [CredentialsPage],
      providers: [
        CredentialCryptoService,
        CredentialVaultSessionService,
        {
          provide: CredentialVaultApiService,
          useValue: { metadata: () => of(metadata), list: () => of({ data: [], count: 0 }) },
        },
        { provide: AppLockService, useValue: { locked: signal(false) } },
        { provide: AuthState, useValue: { authenticated: signal(true) } },
        { provide: ConfirmationService, useValue: { confirm: vi.fn() } },
        { provide: SnackbarService, useValue: { success: vi.fn(), error: vi.fn() } },
        { provide: LinksService, useValue: { open: vi.fn() } },
      ],
    });
  });

  it('filters decrypted records locally without calling the API', () => {
    const fixture = TestBed.createComponent(CredentialsPage);
    fixture.componentInstance.records.set([
      {
        encrypted: {
          id: 'one',
          cryptoVersion: 1,
          iv: 'iv',
          ciphertext: 'ciphertext',
          revision: 1,
          createdAt: '',
          updatedAt: '',
        },
        payload: {
          payloadVersion: 1,
          clientRecordId: 'client-one',
          name: 'Production database',
          type: 'database',
          username: 'orbit',
          secret: 'secret',
          url: '',
          host: '',
          port: '',
          environment: 'production',
          notes: '',
          tags: ['critical'],
        },
      },
    ]);

    fixture.componentInstance.setSearch({ detail: { value: 'critical' } });

    expect(fixture.componentInstance.filtered()).toHaveLength(1);
    expect(fixture.componentInstance.filtered()[0].payload.name).toBe('Production database');
  });

  it('caps visible selection at twenty-five credentials', () => {
    const fixture = TestBed.createComponent(CredentialsPage);
    const page = fixture.componentInstance;
    for (let index = 0; index < 26; index += 1) page.toggle(String(index), { detail: { checked: true } });

    expect(page.selected().size).toBe(25);
    expect(page.selected().has('25')).toBe(false);
  });

  it('clears decrypted state when the vault key is removed', () => {
    const fixture = TestBed.createComponent(CredentialsPage);
    const page = fixture.componentInstance;
    page.state.set('unlocked');
    page.records.set([
      {
        encrypted: {
          id: 'one',
          cryptoVersion: 1,
          iv: 'iv',
          ciphertext: 'ciphertext',
          revision: 1,
          createdAt: '',
          updatedAt: '',
        },
        payload: {
          payloadVersion: 1,
          clientRecordId: 'client-one',
          name: 'Credential',
          type: 'other',
          username: '',
          secret: 'secret',
          url: '',
          host: '',
          port: '',
          environment: '',
          notes: '',
          tags: [],
        },
      },
    ]);
    TestBed.inject(CredentialVaultSessionService).lock();
    fixture.detectChanges();

    expect(page.state()).toBe('locked');
    expect(page.records()).toEqual([]);
  });
});
