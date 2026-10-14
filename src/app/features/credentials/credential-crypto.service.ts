import { Service } from '@angular/core';
import { CredentialEnvelope, CredentialPlaintext, CredentialType, credentialTypes } from './credential.models';

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const keyCheck = 'office-orbit-credential-vault:v1';
const credentialAad = 'office-orbit:credential:v1';
const keyCheckAad = 'office-orbit:vault-key-check:v1';

@Service()
export class CredentialCryptoService {
  async deriveKey(passphrase: string, salt: string, iterations: number): Promise<CryptoKey> {
    const material = await globalThis.crypto.subtle.importKey('raw', this.textBytes(passphrase), 'PBKDF2', false, [
      'deriveKey',
    ]);
    return globalThis.crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: this.fromBase64Url(salt), iterations },
      material,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt'],
    );
  }

  randomSalt(): string {
    return this.toBase64Url(globalThis.crypto.getRandomValues(new Uint8Array(32)));
  }

  async encryptCredential(key: CryptoKey, payload: CredentialPlaintext): Promise<CredentialEnvelope> {
    return this.encrypt(key, JSON.stringify(payload), credentialAad);
  }

  async decryptCredential(key: CryptoKey, envelope: CredentialEnvelope): Promise<CredentialPlaintext> {
    return this.parseCredential(JSON.parse(await this.decrypt(key, envelope, credentialAad)));
  }

  async createKeyCheck(key: CryptoKey): Promise<CredentialEnvelope> {
    return this.encrypt(key, keyCheck, keyCheckAad);
  }

  async verifiesKeyCheck(key: CryptoKey, envelope: CredentialEnvelope): Promise<boolean> {
    try {
      return (await this.decrypt(key, envelope, keyCheckAad)) === keyCheck;
    } catch {
      return false;
    }
  }

  toBase64Url(bytes: Uint8Array): string {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000)
      binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
  }

  fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
    if (!/^[A-Za-z0-9_-]*$/u.test(value)) throw new Error('Invalid base64url value.');
    const padded = value.replaceAll('-', '+').replaceAll('_', '/') + '='.repeat((4 - (value.length % 4)) % 4);
    const decoded = atob(padded);
    const buffer = new ArrayBuffer(decoded.length);
    const bytes = new Uint8Array(buffer);
    for (let index = 0; index < decoded.length; index += 1) bytes[index] = decoded.charCodeAt(index);
    if (this.toBase64Url(bytes) !== value) throw new Error('Non-canonical base64url value.');
    return bytes;
  }

  private async encrypt(key: CryptoKey, text: string, aad: string): Promise<CredentialEnvelope> {
    const iv = this.ownedBytes(globalThis.crypto.getRandomValues(new Uint8Array(12)));
    const ciphertext = await globalThis.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv, additionalData: this.textBytes(aad) },
      key,
      this.textBytes(text),
    );
    return { cryptoVersion: 1, iv: this.toBase64Url(iv), ciphertext: this.toBase64Url(new Uint8Array(ciphertext)) };
  }

  private async decrypt(key: CryptoKey, envelope: CredentialEnvelope, aad: string): Promise<string> {
    const plaintext = await globalThis.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: this.fromBase64Url(envelope.iv),
        additionalData: this.textBytes(aad),
      },
      key,
      this.fromBase64Url(envelope.ciphertext),
    );
    return decoder.decode(plaintext);
  }

  private textBytes(value: string): Uint8Array<ArrayBuffer> {
    return this.ownedBytes(encoder.encode(value));
  }

  private ownedBytes(source: Uint8Array<ArrayBufferLike>): Uint8Array<ArrayBuffer> {
    const buffer = new ArrayBuffer(source.byteLength);
    const bytes = new Uint8Array(buffer);
    bytes.set(source);
    return bytes;
  }

  private parseCredential(value: unknown): CredentialPlaintext {
    if (!value || typeof value !== 'object') throw new Error('Invalid credential payload.');
    const payload = value as Record<string, unknown>;
    const validType = credentialTypes.some(type => type.value === payload['type']);
    if (payload['payloadVersion'] !== 1 || !validType || !Array.isArray(payload['tags'])) {
      throw new Error('Invalid credential payload.');
    }
    const fields = ['clientRecordId', 'name', 'username', 'secret', 'url', 'host', 'port', 'environment', 'notes'];
    if (
      fields.some(field => typeof payload[field] !== 'string') ||
      payload['tags'].some(tag => typeof tag !== 'string')
    ) {
      throw new Error('Invalid credential payload.');
    }
    return {
      payloadVersion: 1,
      clientRecordId: payload['clientRecordId'] as string,
      name: payload['name'] as string,
      type: payload['type'] as CredentialType,
      username: payload['username'] as string,
      secret: payload['secret'] as string,
      url: payload['url'] as string,
      host: payload['host'] as string,
      port: payload['port'] as string,
      environment: payload['environment'] as string,
      notes: payload['notes'] as string,
      tags: payload['tags'] as string[],
    };
  }
}
