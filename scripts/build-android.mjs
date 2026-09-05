import { execFileSync } from 'node:child_process';
import { readFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, rmSync } from 'node:fs';
const version = JSON.parse(readFileSync('android-version.json', 'utf8'));
const releasePatterns = [/\.apk$/i, /\.aab$/i, /\.apk\.idsig$/i, /-mapping\.txt$/i];
mkdirSync('releases', { recursive: true });
for (const file of readdirSync('releases')) {
  if (releasePatterns.some(pattern => pattern.test(file))) {
    rmSync('releases/' + file);
  }
}
execFileSync(process.execPath, ['scripts/patch-android.mjs'], { stdio: 'inherit' });
const gradle = readFileSync('android/app/build.gradle', 'utf8');
if (!/^apply plugin:\s*['"]com\.android\.application['"]\s*\r?\n\r?\nandroid\s*\{/m.test(gradle)) {
  const preview = gradle.split(/\r?\n/).slice(0, 8).join('\n');
  throw new Error(`android/app/build.gradle is not ready for release build:\n${preview}`);
}
execFileSync(
  './gradlew',
  ['assembleRelease', 'bundleRelease', '-PversionCode=' + version.versionCode, '-PversionName=' + version.versionName],
  { cwd: 'android', stdio: 'inherit' },
);
const name = 'OfficeOrbit-' + version.versionName.replaceAll('.', '-');
copyFileSync('android/app/build/outputs/apk/release/app-release-unsigned.apk', 'releases/' + name + '-unsigned.apk');
copyFileSync('android/app/build/outputs/bundle/release/app-release.aab', 'releases/' + name + '-unsigned.aab');
const mapping = 'android/app/build/outputs/mapping/release/mapping.txt';
if (existsSync(mapping)) copyFileSync(mapping, 'releases/' + name + '-mapping.txt');
console.log('Unsigned APK/AAB collected in releases/. GitHub Actions handles optional signing.');
