import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
const file = 'release-keystore.jks';
if (existsSync(file)) throw new Error('Keystore already exists. Refusing to overwrite your signing identity.');
const args = [
  '-genkeypair',
  '-keystore',
  file,
  '-storetype',
  'PKCS12',
  '-alias',
  'officeorbit',
  '-keyalg',
  'RSA',
  '-keysize',
  '3072',
  '-validity',
  '10000',
  '-dname',
  'CN=Office Orbit, OU=Mobile, O=Office Orbit, C=IN',
];
if (process.env.KEYSTORE_PASSWORD)
  args.push('-storepass:env', 'KEYSTORE_PASSWORD', '-keypass:env', 'KEYSTORE_PASSWORD');
try {
  execFileSync('keytool', args, { stdio: 'inherit' });
  console.log('Created release-keystore.jks; alias: officeorbit. Keep a secure offline backup.');
} catch {
  process.exitCode = 1;
}
