import { describe, it, expect } from 'vitest';
import { createPin, parsePin, validPin, verifyPin } from './pin';
describe('PIN derivation', () => {
  it('accepts only four to six numeric digits', () => {
    for (const pin of ['1234', '012345', '123456']) expect(validPin(pin)).toBe(true);
    for (const pin of ['', '123', '1234567', '12a4', ' 1234', '１２３４']) expect(validPin(pin)).toBe(false);
  });
  it('salts each verifier and verifies without storing plaintext', async () => {
    const first = await createPin('4931');
    const second = await createPin('4931');
    expect(first.salt).not.toBe(second.salt);
    expect(first.verifier).not.toBe(second.verifier);
    expect(await verifyPin('4931', first)).toBe(true);
    expect(await verifyPin('4932', first)).toBe(false);
    expect(Object.keys(first)).not.toContain('pin');
    expect(parsePin(JSON.stringify(first))).toEqual(first);
  });
  it('fails closed for corrupt metadata and unsupported derivation costs', () => {
    expect(() => parsePin('{}')).toThrow();
    expect(() => parsePin('invalid')).toThrow();
  });
});
