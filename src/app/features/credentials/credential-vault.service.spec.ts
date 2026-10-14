import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthState } from '../../core/auth/auth-state';
import { CredentialVaultSessionService } from './credential-vault.service';
import { CredentialVaultApiService } from './credential-vault.service';
import { environment } from '../../../environments/environment';

describe('CredentialVaultSessionService', () => {
  it('keeps the key only in memory and drops it when the app lock engages', () => {
    const locked = signal(false);
    const authenticated = signal(true);
    TestBed.configureTestingModule({
      providers: [
        CredentialVaultSessionService,
        { provide: AppLockService, useValue: { locked } },
        { provide: AuthState, useValue: { authenticated } },
      ],
    });
    const service = TestBed.inject(CredentialVaultSessionService);
    service.unlock({} as CryptoKey);
    expect(service.key()).not.toBeNull();
    locked.set(true);
    TestBed.tick();
    expect(service.key()).toBeNull();
  });

  it('drops the in-memory key when authentication is lost', () => {
    const locked = signal(false);
    const authenticated = signal(true);
    TestBed.configureTestingModule({
      providers: [
        CredentialVaultSessionService,
        { provide: AppLockService, useValue: { locked } },
        { provide: AuthState, useValue: { authenticated } },
      ],
    });
    const service = TestBed.inject(CredentialVaultSessionService);
    service.unlock({} as CryptoKey);
    expect(service.key()).not.toBeNull();

    authenticated.set(false);
    TestBed.tick();

    expect(service.key()).toBeNull();
  });

  it('resets the inactivity deadline whenever vault activity is recorded', () => {
    vi.useFakeTimers();
    try {
      const locked = signal(false);
      const authenticated = signal(true);
      TestBed.configureTestingModule({
        providers: [
          CredentialVaultSessionService,
          { provide: AppLockService, useValue: { locked } },
          { provide: AuthState, useValue: { authenticated } },
        ],
      });
      const service = TestBed.inject(CredentialVaultSessionService);
      service.unlock({} as CryptoKey);
      expect(service.key()).not.toBeNull();

      vi.advanceTimersByTime(10 * 60_000 - 1);
      expect(service.key()).not.toBeNull();
      service.touch();

      vi.advanceTimersByTime(10 * 60_000 - 1);
      expect(service.key()).not.toBeNull();
      vi.advanceTimersByTime(1);
      expect(service.key()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('CredentialVaultApiService', () => {
  let api: CredentialVaultApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CredentialVaultApiService, provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(CredentialVaultApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends encrypted envelopes directly and includes expectedRevision on updates', () => {
    api.create({ cryptoVersion: 1, iv: 'iv', ciphertext: 'ciphertext' }).subscribe();
    const create = http.expectOne(`${environment.apiBaseUrl}/api/credentials`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ cryptoVersion: 1, iv: 'iv', ciphertext: 'ciphertext' });
    create.flush({
      data: {
        id: 'credential',
        cryptoVersion: 1,
        iv: 'iv',
        ciphertext: 'ciphertext',
        revision: 1,
        createdAt: '',
        updatedAt: '',
      },
    });

    api
      .update('credential', {
        cryptoVersion: 1,
        iv: 'updated-iv',
        ciphertext: 'updated-ciphertext',
        expectedRevision: 2,
      })
      .subscribe();
    const update = http.expectOne(`${environment.apiBaseUrl}/api/credentials/credential`);
    expect(update.request.method).toBe('PATCH');
    expect(update.request.body.expectedRevision).toBe(2);
    update.flush({
      data: {
        id: 'credential',
        cryptoVersion: 1,
        iv: 'updated-iv',
        ciphertext: 'updated-ciphertext',
        revision: 3,
        createdAt: '',
        updatedAt: '',
      },
    });
  });

  it('uses the bulk-delete endpoint with the selected credential IDs', () => {
    api.bulkDelete(['one', 'two']).subscribe();
    const request = http.expectOne(`${environment.apiBaseUrl}/api/credentials/bulk-delete`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ credentialIds: ['one', 'two'] });
    request.flush({ requested: 2, deleted: 2, failed: [], allSucceeded: true });
  });
});
