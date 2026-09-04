import { execFileSync } from 'node:child_process';
import { mkdirSync, existsSync, copyFileSync, writeFileSync } from 'node:fs';
const res = 'android/app/src/main/res';
if (!existsSync(res)) throw new Error('Run npm run android:add first.');
const source = 'src/assets/office-orbit.png';
let command = 'magick';
try {
  execFileSync(command, ['-version'], { stdio: 'ignore' });
} catch {
  command = 'convert';
  try {
    execFileSync(command, ['-version'], { stdio: 'ignore' });
  } catch {
    throw new Error('Install ImageMagick in WSL: sudo apt-get install imagemagick');
  }
}
const convert = (size, art, output, background = 'none') =>
  execFileSync(command, [
    source,
    '-background',
    background,
    '-resize',
    art + 'x' + art,
    '-gravity',
    'center',
    '-extent',
    size + 'x' + size,
    output,
  ]);
for (const [density, size] of Object.entries({ mdpi: 48, hdpi: 72, xhdpi: 96, xxhdpi: 144, xxxhdpi: 192 })) {
  const folder = res + '/mipmap-' + density;
  mkdirSync(folder, { recursive: true });
  convert(size, Math.round(size * 0.7), folder + '/ic_launcher.png');
  copyFileSync(folder + '/ic_launcher.png', folder + '/ic_launcher_round.png');
  // Adaptive foreground uses the Android 108dp canvas with artwork inside its 66dp safe zone.
  convert(Math.round((size * 108) / 48), Math.round((size * 60) / 48), folder + '/ic_launcher_foreground.png');
}
mkdirSync(res + '/mipmap-anydpi-v26', { recursive: true });
const adaptive =
  '<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android"><background android:drawable="@color/office_orbit_icon_background"/><foreground android:drawable="@mipmap/ic_launcher_foreground"/></adaptive-icon>';
for (const file of ['ic_launcher.xml', 'ic_launcher_round.xml'])
  writeFileSync(res + '/mipmap-anydpi-v26/' + file, adaptive);
mkdirSync(res + '/values', { recursive: true });
writeFileSync(
  res + '/values/office_orbit_colors.xml',
  '<resources><color name="office_orbit_icon_background">#f3f7f4</color></resources>',
);
mkdirSync(res + '/drawable-nodpi', { recursive: true });
mkdirSync('releases', { recursive: true });
convert(512, 360, res + '/drawable-nodpi/office_orbit_splash_logo.png');
convert(512, 420, 'releases/playstore-icon.png', '#f3f7f4');
console.log('Generated Office Orbit launcher, splash and Play Store icons.');
