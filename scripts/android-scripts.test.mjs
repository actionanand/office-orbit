import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const scripts = path.dirname(fileURLToPath(import.meta.url));
function fixture(run) {
  const parent = path.resolve(tmpdir());
  const root = mkdtempSync(path.join(parent, 'office-orbit-script-test-'));
  try {
    run(root);
  } finally {
    const target = path.resolve(root);
    assert.equal(path.dirname(target), parent);
    assert.ok(path.basename(target).startsWith('office-orbit-script-test-'));
    rmSync(target, { recursive: true, force: true });
  }
}
function write(root, relative, value) {
  const file = path.join(root, relative);
  mkdirSync(path.dirname(file), { recursive: true });
  writeFileSync(file, value);
}
function runScript(root, name, args = []) {
  return execFileSync(process.execPath, [path.join(scripts, name), ...args], { cwd: root, encoding: 'utf8' });
}
test('Android version increments monotonically and validates input', () =>
  fixture(root => {
    write(root, 'android-version.json', JSON.stringify({ versionCode: 10, versionName: '2.3.4' }));
    runScript(root, 'bump-android-version.js');
    runScript(root, 'bump-android-version.js', ['--minor']);
    assert.deepEqual(JSON.parse(readFileSync(path.join(root, 'android-version.json'))), {
      versionCode: 12,
      versionName: '2.4.0',
    });
    write(root, 'android-version.json', JSON.stringify({ versionCode: -1, versionName: '2.4.0' }));
    assert.throws(() => runScript(root, 'bump-android-version.js'));
  }));
test('Android patch is idempotent and restricts permissions and backup', () =>
  fixture(root => {
    write(root, 'capacitor.config.ts', "export default {appId: 'com.example.officeorbit'};");
    write(root, 'android-version.json', JSON.stringify({ versionCode: 12, versionName: '2.4.0' }));
    write(root, 'src/assets/office-orbit.png', 'fixture artwork');
    write(
      root,
      'android/app/src/main/AndroidManifest.xml',
      '<manifest xmlns:android="http://schemas.android.com/apk/res/android"><uses-permission android:name="android.permission.INTERNET"/><application android:allowBackup="true"></application></manifest>',
    );
    write(
      root,
      'android/app/build.gradle',
      'android { defaultConfig {\nversionCode 1\nversionName "1.0"\n}\nbuildTypes { release { minifyEnabled false } } }',
    );
    write(root, 'android/app/proguard-rules.pro', '# generated');
    runScript(root, 'patch-android.mjs');
    function snapshot(directory) {
      return readdirSync(directory, { withFileTypes: true })
        .flatMap(entry => {
          const file = path.join(directory, entry.name);
          return entry.isDirectory() ? snapshot(file) : [[path.relative(root, file), readFileSync(file, 'utf8')]];
        })
        .sort(([a], [b]) => a.localeCompare(b));
    }
    const first = snapshot(path.join(root, 'android'));
    runScript(root, 'patch-android.mjs');
    assert.deepEqual(snapshot(path.join(root, 'android')), first);
    const manifest = readFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'utf8');
    assert.match(manifest, /allowBackup="false"/);
    assert.match(manifest, /usesCleartextTraffic="false"/);
    assert.equal(manifest.match(/USE_BIOMETRIC/g)?.length, 1);
    assert.doesNotMatch(manifest, /POST_NOTIFICATIONS|RECEIVE_BOOT_COMPLETED/);
    const activity = readFileSync(
      path.join(root, 'android/app/src/main/java/com/example/officeorbit/MainActivity.java'),
      'utf8',
    );
    assert.match(activity, /Math.round\(168/);
    assert.match(activity, /package com.example.officeorbit;/);
    assert.match(activity, /registerPlugin\(OfficeOrbitExportPlugin.class\)/);
    assert.equal(manifest.match(/\.exportprovider/g)?.length, 1);
    const exporter = readFileSync(
      path.join(root, 'android/app/src/main/java/com/example/officeorbit/OfficeOrbitExportPlugin.java'),
      'utf8',
    );
    assert.match(exporter, /getCacheDir\(\)/);
    assert.match(exporter, /FLAG_GRANT_READ_URI_PERMISSION/);
    assert.match(exporter, /application\/pdf/);
    assert.doesNotMatch(manifest, /WRITE_EXTERNAL_STORAGE|MANAGE_EXTERNAL_STORAGE/);
  }));
