export interface PinRecord {
  version: 1;
  salt: string;
  verifier: string;
  iterations: number;
  failures: number;
  retryAt: number;
  biometric: boolean;
}
export const validPin = (value: string): boolean => /^\d{4,6}$/.test(value);
const encode = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const decode = (value: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(value), char => char.charCodeAt(0));
async function derive(pin: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveBits']);
  return encode(
    new Uint8Array(
      await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: decode(salt), iterations, hash: 'SHA-256' }, key, 256),
    ),
  );
}
export async function createPin(pin: string): Promise<PinRecord> {
  if (!validPin(pin)) throw new Error('Use 4 to 6 digits.');
  const salt = encode(crypto.getRandomValues(new Uint8Array(16)));
  const iterations = 600000;
  return {
    version: 1,
    salt,
    iterations,
    verifier: await derive(pin, salt, iterations),
    failures: 0,
    retryAt: 0,
    biometric: false,
  };
}
export async function verifyPin(pin: string, record: PinRecord): Promise<boolean> {
  if (!validPin(pin)) return false;
  const actual = await derive(pin, record.salt, record.iterations);
  let difference = actual.length ^ record.verifier.length;
  for (let index = 0; index < actual.length; index++)
    difference |= actual.charCodeAt(index) ^ record.verifier.charCodeAt(index);
  return difference === 0;
}
export function parsePin(raw: string): PinRecord {
  const value: unknown = JSON.parse(raw);
  if (
    typeof value !== 'object' ||
    value === null ||
    !('version' in value) ||
    value.version !== 1 ||
    !('salt' in value) ||
    typeof value.salt !== 'string' ||
    !/^[A-Za-z0-9+/]{22}==$/.test(value.salt) ||
    !('verifier' in value) ||
    typeof value.verifier !== 'string' ||
    !/^[A-Za-z0-9+/]{43}=$/.test(value.verifier) ||
    !('iterations' in value) ||
    value.iterations !== 600000 ||
    !('failures' in value) ||
    typeof value.failures !== 'number' ||
    !Number.isSafeInteger(value.failures) ||
    value.failures < 0 ||
    !('retryAt' in value) ||
    typeof value.retryAt !== 'number' ||
    !Number.isFinite(value.retryAt) ||
    value.retryAt < 0 ||
    !('biometric' in value) ||
    typeof value.biometric !== 'boolean'
  )
    throw new Error('Local security settings could not be read.');
  return {
    version: 1,
    salt: value.salt,
    verifier: value.verifier,
    iterations: value.iterations,
    failures: value.failures,
    retryAt: value.retryAt,
    biometric: value.biometric,
  };
}
