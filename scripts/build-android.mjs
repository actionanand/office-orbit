import { execFileSync } from 'node:child_process';
import { readFileSync, copyFileSync, mkdirSync, existsSync } from 'node:fs';
const version = JSON.parse(readFileSync('android-version.json', 'utf8'));
execFileSync(
  './gradlew',
  ['assembleRelease', 'bundleRelease', '-PversionCode=' + version.versionCode, '-PversionName=' + version.versionName],
  { cwd: 'android', stdio: 'inherit' },
);
mkdirSync('releases', { recursive: true });
const name = 'OfficeOrbit-' + version.versionName.replaceAll('.', '-');
copyFileSync('android/app/build/outputs/apk/release/app-release-unsigned.apk', 'releases/' + name + '-unsigned.apk');
copyFileSync('android/app/build/outputs/bundle/release/app-release.aab', 'releases/' + name + '-unsigned.aab');
const mapping = 'android/app/build/outputs/mapping/release/mapping.txt';
if (existsSync(mapping)) copyFileSync(mapping, 'releases/' + name + '-mapping.txt');
console.log('Unsigned APK/AAB collected in releases/. GitHub Actions handles optional signing.');
