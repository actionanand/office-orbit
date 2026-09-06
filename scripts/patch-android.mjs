import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
const root = process.cwd(),
  android = path.join(root, 'android');
if (!existsSync(android)) throw new Error('android/ is missing. Run npm run android:add first.');
const config = await readFile(path.join(root, 'capacitor.config.ts'), 'utf8');
const appId = config.match(/appId:\s*'([^']+)'/)?.[1];
if (!appId || !/^([a-zA-Z]\w*\.)+[a-zA-Z]\w*$/.test(appId)) throw new Error('Invalid app ID.');
const res = path.join(android, 'app/src/main/res');
async function write(file, text) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, text);
}
const manifestFile = path.join(android, 'app/src/main/AndroidManifest.xml');
let manifest = await readFile(manifestFile, 'utf8');
manifest = manifest.replace(
  /\sandroid:(allowBackup|fullBackupContent|dataExtractionRules|usesCleartextTraffic)="[^"]*"/g,
  '',
);
manifest = manifest.replace(
  '<application',
  '<application android:allowBackup="false" android:fullBackupContent="@xml/backup_rules" android:dataExtractionRules="@xml/data_extraction_rules" android:usesCleartextTraffic="false"',
);
if (!manifest.includes('android.permission.USE_BIOMETRIC'))
  manifest = manifest.replace(
    '<application',
    '<uses-permission android:name="android.permission.USE_BIOMETRIC" />\n    <application',
  );
await writeFile(manifestFile, manifest);
const domains = [
  'root',
  'file',
  'database',
  'sharedpref',
  'external',
  'device_root',
  'device_file',
  'device_database',
  'device_sharedpref',
];
const excludes = domains.map(domain => `<exclude domain="${domain}" path="."/>`).join('');
await write(path.join(res, 'xml/backup_rules.xml'), `<full-backup-content>${excludes}</full-backup-content>`);
await write(
  path.join(res, 'xml/data_extraction_rules.xml'),
  `<data-extraction-rules><cloud-backup>${excludes}</cloud-backup><device-transfer>${excludes}</device-transfer></data-extraction-rules>`,
);
await mkdir(path.join(res, 'drawable-nodpi'), { recursive: true });
const splashLogo = path.join(res, 'drawable-nodpi/office_orbit_splash_logo.png');
// android:assets writes a safely padded splash bitmap. Preserve it when the
// release helper reapplies this patch immediately before Gradle runs.
if (!existsSync(splashLogo)) await copyFile(path.join(root, 'src/assets/office-orbit.png'), splashLogo);
await write(
  path.join(res, 'drawable/office_orbit_splash_icon.xml'),
  `<layer-list xmlns:android="http://schemas.android.com/apk/res/android"><item android:width="168dp" android:height="168dp" android:gravity="center" android:drawable="@drawable/office_orbit_splash_logo"/></layer-list>`,
);
for (const [directory, background, dark] of [
  ['values', '#f3f7f4', false],
  ['values-night', '#101b17', true],
]) {
  await write(
    path.join(res, directory, 'styles.xml'),
    `<resources>
<style name="AppTheme" parent="Theme.AppCompat.DayNight.DarkActionBar"><item name="colorPrimary">#17633f</item><item name="colorPrimaryDark">#145737</item><item name="colorAccent">#17633f</item></style>
<style name="AppTheme.NoActionBar" parent="Theme.AppCompat.DayNight.NoActionBar"><item name="windowActionModeOverlay">true</item><item name="android:background">@null</item><item name="android:statusBarColor">${background}</item><item name="android:navigationBarColor">${background}</item><item name="android:windowLightStatusBar">${dark ? 'false' : 'true'}</item><item name="android:windowLightNavigationBar">${dark ? 'false' : 'true'}</item></style>
<style name="AppTheme.NoActionBarLaunch" parent="Theme.SplashScreen"><item name="windowSplashScreenBackground">${background}</item><item name="windowSplashScreenAnimatedIcon">@drawable/office_orbit_splash_icon</item><item name="postSplashScreenTheme">@style/AppTheme.NoActionBar</item><item name="android:statusBarColor">${background}</item><item name="android:navigationBarColor">${background}</item><item name="android:windowLightStatusBar">${dark ? 'false' : 'true'}</item><item name="android:windowLightNavigationBar">${dark ? 'false' : 'true'}</item></style>
</resources>`,
  );
}
const javaFile = path.join(android, 'app/src/main/java', ...appId.split('.'), 'MainActivity.java');
await write(
  javaFile,
  `package ${appId};
import android.os.Bundle;
import android.os.Build;
import android.graphics.Color;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.content.res.Configuration;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      getBridge().getWebView().setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_YES);
    }
    final FrameLayout overlay = new FrameLayout(this);
    boolean dark = (getResources().getConfiguration().uiMode & Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES;
    overlay.setBackgroundColor(Color.parseColor(dark ? "#101b17" : "#f3f7f4"));
    ImageView logo = new ImageView(this);
    logo.setImageResource(R.drawable.office_orbit_splash_logo);
    logo.setScaleType(ImageView.ScaleType.FIT_CENTER);
    logo.setContentDescription("Office Orbit");
    int size = Math.round(168 * getResources().getDisplayMetrics().density);
    overlay.addView(logo,new FrameLayout.LayoutParams(size,size,Gravity.CENTER));
    addContentView(overlay,new ViewGroup.LayoutParams(-1,-1));
    overlay.postDelayed(() -> { if(overlay.getParent() instanceof ViewGroup) ((ViewGroup)overlay.getParent()).removeView(overlay); },1100);
  }
}`,
);
const gradleFile = path.join(android, 'app/build.gradle');
let gradle = await readFile(gradleFile, 'utf8');
const version = JSON.parse(await readFile(path.join(root, 'android-version.json'), 'utf8'));
function normalizeGradleHeader(text) {
  let output = text.replace(/^\uFEFF/, '');
  if (/^\s*plugins\s*\{/.test(output)) {
    const androidBlock = output.match(/\r?\nandroid\s*\{/);
    const pluginsEnd = output.match(/\r?\n\}\r?\n/);
    if (androidBlock && (!pluginsEnd || pluginsEnd.index > androidBlock.index)) {
      output = output.slice(androidBlock.index + 1);
    } else if (pluginsEnd) {
      output = output.slice(pluginsEnd.index + pluginsEnd[0].length);
    }
  }
  output = output.replace(/^\s*apply plugin:\s*['"]com\.android\.application['"]\s*\r?\n*/m, '');
  return `apply plugin: 'com.android.application'\n\n${output.trimStart()}`;
}
gradle = normalizeGradleHeader(gradle);
gradle = gradle.replace(
  /versionCode .*/,
  'versionCode project.hasProperty("versionCode") ? project.versionCode.toInteger() : ' + version.versionCode,
);
gradle = gradle.replace(
  /versionName .*/,
  'versionName project.hasProperty("versionName") ? project.versionName : "' + version.versionName + '"',
);
gradle = gradle.replace(/minifyEnabled\s+false/, 'minifyEnabled true');
if (!gradle.includes('shrinkResources true'))
  gradle = gradle.replace('minifyEnabled true', 'minifyEnabled true\n            shrinkResources true');
if (!/^apply plugin:\s*['"]com\.android\.application['"]\s*\r?\n\r?\nandroid\s*\{/m.test(gradle)) {
  throw new Error(`Could not normalize ${gradleFile}. Expected Android application plugin followed by android block.`);
}
await writeFile(gradleFile, gradle);
const proguard = path.join(android, 'app/proguard-rules.pro');
const rules = await readFile(proguard, 'utf8');
if (!rules.includes('OFFICE_ORBIT_PLUGINS'))
  await writeFile(
    proguard,
    rules +
      '\n# OFFICE_ORBIT_PLUGINS\n-keep class com.getcapacitor.** { *; }\n-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }\n-keepclassmembers class * { @com.getcapacitor.PluginMethod <methods>; }\n',
  );
await import('./patch-android-export.mjs');
console.log('Applied Office Orbit Android identity, secure backup policy, splash sizing and R8 configuration.');
