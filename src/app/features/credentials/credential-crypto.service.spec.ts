import { TestBed } from '@angular/core/testing';
import { CredentialCryptoService } from './credential-crypto.service';
import { CredentialPlaintext } from './credential.models';

const payload: CredentialPlaintext = {
  payloadVersion: 1,
  clientRecordId: 'client-record-id',
  name: 'CRI Database',
  type: 'database',
  username: 'orbit',
  secret: 'secret-value',
  url: 'https://example.test',
  host: 'db.example.test',
  port: '443',
  environment: 'production',
  notes: 'private',
  tags: ['office'],
};

describe('CredentialCryptoService', () => {
  let service: CredentialCryptoService;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CredentialCryptoService] });
    service = TestBed.inject(CredentialCryptoService);
  });

  it('uses unpadded base64url and round-trips bytes', () => {
    const encoded = service.toBase64Url(new Uint8Array([255, 254, 253]));
    expect(encoded).not.toContain('=');
    expect(service.fromBase64Url(encoded)).toEqual(new Uint8Array([255, 254, 253]));
  });

  it('derives a non-extractable key and encrypts credentials with fresh IVs', async () => {
    const key = await service.deriveKey('credential-vault-passphrase', service.randomSalt(), 310000);
    const first = await service.encryptCredential(key, payload);
    const second = await service.encryptCredential(key, payload);
    expect(first.iv).not.toBe(second.iv);
    expect(await service.decryptCredential(key, first)).toEqual(payload);
    expect(JSON.stringify(first)).not.toContain(payload.name);
    expect(JSON.stringify(first)).not.toContain(payload.secret);
  });

  it('rejects a wrong passphrase during key-check verification', async () => {
    const salt = service.randomSalt();
    const key = await service.deriveKey('credential-vault-passphrase', salt, 310000);
    const wrongKey = await service.deriveKey('wrong-vault-passphrase', salt, 310000);
    const check = await service.createKeyCheck(key);
    expect(await service.verifiesKeyCheck(key, check)).toBe(true);
    expect(await service.verifiesKeyCheck(wrongKey, check)).toBe(false);
  });
});
