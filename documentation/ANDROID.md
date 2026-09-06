# Office Orbit Android build guide

Office Orbit follows the Life Leaf Capacitor 8 / GitHub Actions release approach. The generated `android/` project is recreated from configuration and idempotent patches; it is not committed.

## Build files

| File                                | Purpose                                                                   |
| ----------------------------------- | ------------------------------------------------------------------------- |
| capacitor.config.ts                 | App ID/name, www output, HTTPS scheme, splash behavior                    |
| android-version.json                | Monotonic versionCode and public versionName                              |
| scripts/bump-android-version.js     | Bump code and optionally semantic version                                 |
| scripts/patch-android.mjs           | Branding, 168dp launch image, backup exclusions, biometric permission, R8 |
| scripts/generate-android-assets.mjs | Launcher densities, adaptive foregrounds, splash and store icon           |
| scripts/build-android.mjs           | Local WSL APK/AAB build and release collection                            |
| scripts/generate-keystore.mjs       | Non-overwriting OpenSSL PKCS12 signing-key generator                      |
| scripts/detect-keystore-format.mjs  | Inspect a keystore using Java keytool                                     |
| .github/workflows/android-build.yml | Install, lint/test, bump, build, sign, verify, commit and upload          |
| src/assets/office-orbit.png         | Canonical app and brand icon                                              |

App ID: `com.actionanand.officeorbit.app`. Change only `appId` in capacitor.config.ts before your first store release, then regenerate Android. The native patch derives the Java package from this value. Published application IDs cannot be changed for an existing Play Store listing.

`android-version.json` is the single source for `versionCode` and `versionName`. The Android build, release file names and in-app Settings version all read from this file, so do not duplicate the app version in environment files.

## Required packages

Run in WSL2:

```bash
npm i @capacitor/android@8.5.0 @capacitor/browser@8 @capacitor/splash-screen@8 @aparajita/capacitor-secure-storage@8.0.0 @aparajita/capacitor-biometric-auth@10.0.0
```

Commit package.json and the regenerated package-lock.json together. CI uses npm ci and will reject a stale lockfile. The existing Angular, Ionic, TypeScript and Capacitor versions have not been downgraded.

## Local WSL2 workflow

Use Node 24.16 (matching CI), Java 21, Android SDK/Studio, OpenSSL, and ImageMagick:

```bash
sudo apt-get install openssl imagemagick
npm run android:add
npm run android:sync
npm run android:open
```

`android:sync` builds web output, syncs native plugins, patches Android, and regenerates artwork. If www is already built, use `android:sync:only`. Run `android:add` only when the platform does not yet exist. Open the generated project from an environment with Android Studio.

Local release output:

```bash
npm run android:version
npm run android:release
```

This removes old APK, AAB, APK signing sidecar and R8 mapping files before building, then copies the current unsigned release formats and any R8 mapping to releases/. The release helper reapplies and validates the Android patch immediately before Gradle runs, so generated Gradle files are normalized after Capacitor sync. Signing is optional and handled by GitHub Actions. Unsigned APKs cannot be installed as-is.

## Splash and launcher sizing

The original PNG is never modified. ImageMagick derives all Android artwork:

- Legacy launcher artwork occupies 70% of 48/72/96/144/192px density canvases.
- Adaptive foregrounds use a 108dp-equivalent canvas with artwork limited to 60dp, inside Android's 66dp safe region, so common launcher masks do not clip the brand.
- The splash bitmap fits 288px of a centered 512px transparent canvas. This smaller footprint protects the wide orbit ring from Android's circular splash mask. Reapplying the native patch preserves the generated safe-area bitmap instead of replacing it with the edge-to-edge source artwork.
- A centered 168dp × 168dp launch ImageView is shown for 1.1 seconds. Android's platform splash uses the same bounded drawable. The Capacitor splash is configured for 1.8 seconds with CENTER_INSIDE and no spinner.
- Startup authorization has its own loading screen, independent of the timed native splash. Native startup is capped at 20 seconds; failures show a retry action instead of an endless spinner.
- The Play Store icon uses a 420px composition on an opaque 512px `#f3f7f4` canvas.
- Light native surfaces use `#f3f7f4`; Android night resources use `#101b17`. The native launch background follows the OS; Angular then applies the saved app theme.

After replacing `src/assets/office-orbit.png`, rerun `npm run android:sync`. CI regenerates the launcher, splash and releases/playstore-icon.png every time.

## Versioning

```bash
npm run android:version
npm run android:version:patch
npm run android:version:minor
npm run android:version:major
```

The plain command changes only versionCode. Semantic variants also change versionName. Every Play upload requires a higher code.

On main-android, CI automatically bumps and commits versionCode with [skip ci] before building. A failed build may therefore consume a version code, which is safe. The checked-in versionName controls the visible release name.

## GitHub Actions behavior

- Pushes to `main-android` trigger the Android job.
- Manual dispatch runs only when the selected branch is `main-android`; other refs are explicitly rejected by the job condition.
- No pull request, tag or other branch builds Android.
- Runs serialize by branch.
- Dependencies are installed with npm ci; lint and Vitest run before building.
- CI uses Node 24.16, Java 21, minimum SDK 24, target SDK 36.
- CI generates Android, applies the patch, generates artwork, then runs the guarded release helper for assembleRelease and bundleRelease.
- Signed files are named from `android-version.json`, such as `releases/OfficeOrbit-1-1-0.apk` and `releases/OfficeOrbit-1-1-0.aab` for version 1.1.0.
- Missing or failing signing secrets produce explicitly named `-unsigned.apk` / `-unsigned.aab`, following the reference.
- R8/resource shrinking is enabled. Retain the matching `OfficeOrbit-<version>-mapping.txt` for Play Console deobfuscation.
- Prior APK/AAB/APK signing sidecar/mapping artifacts are removed before each release build. When signing succeeds, temporary `-unsigned` release copies are removed before the release folder is committed.
- The Actions summary identifies signed versus unsigned artifacts.
- Decoded signing material is deleted even when the job fails.
- Generated commits use [skip ci]. Repository Actions permissions must allow the bot to push to main-android. Branch protection may require a suitable repository policy.

The generated release directory is a source-controlled artifact folder, as in Life Leaf; this workflow does not create a GitHub Release object or publish to Google Play.

## Signing secrets

Set these under **Repository Settings → Secrets and variables → Actions**:

| Secret            | Meaning                                                     |
| ----------------- | ----------------------------------------------------------- |
| KEYSTORE_BASE64   | Complete Base64-encoded keystore                            |
| KEYSTORE_PASSWORD | Keystore password                                           |
| KEY_ALIAS         | Key alias; the supplied generator uses officeorbit          |
| KEY_PASSWORD      | Private-key password; with PKCS12 use the keystore password |

Generate a key once on a trusted WSL/Linux machine with OpenSSL:

```bash
npm run generate-keystore -- --password 'KEYSTORE_PASSWORD'
test -s release-keystore.jks
base64 -w 0 release-keystore.jks > keystore.b64.txt
npm run keystore:type
```

Replace `KEYSTORE_PASSWORD` with your real password. The generator uses OpenSSL, so it does not require `keytool` to create the keystore. The `keystore:type` check still uses Java `keytool` to inspect the generated file when Java is available.

The generator also accepts `KEYSTORE_PASSWORD` or `ANDROID_KEYSTORE_PASSWORD` from the environment, and prompts interactively when no password is supplied. It refuses to overwrite an existing key. Avoid putting a real password on a shared terminal, in shell history, CI logs, or source-controlled files.

Never commit `.jks`, `.keystore`, encoded key text, or passwords. Keep a secure offline backup of the release key; losing it can prevent future Play Store updates.

## Storage and permissions

Only Internet and biometric permission are needed. The patch adds USE_BIOMETRIC; it does not copy Life Leaf's diary, notification, alarms, boot receiver or share-target functionality.

Worker access tokens use native Keystore-backed encrypted storage. If that plugin does not respond, the token remains memory-only for the current run and the user signs in again after restarting; tokens never fall back to browser storage. PIN records contain only a salted verifier and may fall back to the app-private IndexedDB used by the Life Leaf security pattern. Both Android backup and device-transfer policies exclude application data. Release cleartext HTTP is disabled. The app has no Notion credentials or Worker signing secrets.

## Troubleshooting

- **npm ci mismatch:** run the installation command in WSL and commit the lockfile.
- **Missing Android platform:** run android:add, then android:sync.
- **Missing ImageMagick:** install it using the WSL command above; CI installs it automatically.
- **Stale icon or splash:** rerun android:sync. Check small, round and adaptive launcher masks on-device.
- **Unsigned output:** inspect the workflow summary and all four signing secrets, including the key alias and PKCS12 password behavior.
- **Worker network error on Android:** check HTTPS connectivity and Worker CORS for https://localhost.
- **Local Worker unreachable:** emulator localhost is the emulator itself; use 10.0.2.2 and a development-only cleartext configuration.
- **Opening screen does not finish:** startup now stops after 20 seconds and presents Try again. Check `adb logcat` for a native storage, biometric or network failure instead of waiting on the spinner indefinitely.
- **Play code conflict:** bump versionCode before rebuilding.
- **API or native security plugin failure:** startup fails closed; fix connectivity/storage and retry.

## Verification status

No packages were installed by the agent and no app/release build was run. Dependencies and the updated lockfile were observed in the workspace; Angular template and test-source type checks pass. The Android scaffold was generated and patched, but Capacitor skipped web-asset sync because www/ has not been built. Resized native assets are generated by android:assets during the later sync/build workflow. Lint, direct PIN cryptography checks and two Android script tests passed. Full Vitest and physical-device results still require verification in the user's configured WSL environment. See [Android security acceptance checks](android-security.md#device-acceptance-checks).
