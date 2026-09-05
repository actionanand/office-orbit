# Office Orbit

Office Orbit is a personal, read-only work-management application for Android and responsive web: Dashboard, JIRAs, Work Log, Sprints, Releases, Feedback, and Work Links.

The existing Angular 22.0.1, Ionic 9.0.0, Capacitor 8.5.0, TypeScript 6, and Vitest setup is retained. The app uses standalone components, lazy feature routes, signals, functional guards/interceptors, and feature-specific API services. Your canonical brand artwork is `src/assets/office-orbit.png`.

## Install in WSL2

The required additions are declared in package.json. For a fresh checkout, run:

```bash
npm i @capacitor/android@8.5.0 @capacitor/browser@8 @capacitor/splash-screen@8 @aparajita/capacitor-secure-storage@8.0.0 @aparajita/capacitor-biometric-auth@10.0.0
```

The updated dependencies and lockfile were observed in the workspace during implementation. Commit `package-lock.json` with the source changes before running Android CI, which uses `npm ci`. Do not use Windows npm against your WSL-managed node_modules.

The native plugins are compatible with Capacitor 8: [secure storage](https://github.com/aparajita/capacitor-secure-storage/blob/main/package.json), [biometric authentication](https://github.com/aparajita/capacitor-biometric-auth/blob/main/package.json).

## Development

```bash
npm run develop          # http://localhost:3037
npm start
npm run lint
npm run typecheck
npm run test:ci          # ng test --watch=false
npm run build           # production web build, output: www/
npm run build:gh        # GitHub Pages base: /office-orbit/
```

The existing web deployment workflow runs on `main-github`. Web hosting must return index.html for application routes; the existing Pages workflow copies index.html to 404.html. The intended web address is [Office Orbit on GitHub Pages](https://actionanand.github.io/office-orbit/).

## Worker configuration

Production API: `https://work-tracker-api.techie-ar.workers.dev`.
Local Worker: `http://localhost:8787`.

Edit `src/environments/environment.ts` for local development; production builds replace it with `environment.prod.ts`. Only the public API URL belongs in these files. The app never calls Notion and has no backend signing secrets.

The Worker must allow your web origin and the Capacitor Android origin `https://localhost` through CORS. Its preflight response must permit Authorization and Content-Type. For emulator-based local Worker development, use `http://10.0.2.2:8787`; cleartext is deliberately disabled in release builds.

## Authentication and local lock

Sign in using only the Worker password. The password is never persisted. Android stores the access token in Keystore-backed secure storage; web uses sessionStorage, never the secure-storage plugin's localStorage implementation. Startup restores the token and verifies it with `GET /api/auth/status` before allowing protected routes.

Sessions expire without refresh tokens. A protected 401 clears authentication and routes to Login. Settings provides an Android-only PIN, followed by optional enrolled strong biometrics. PIN and biometrics unlock only the local app; they cannot generate, refresh, or replace Worker authentication.

PIN verifiers use PBKDF2-SHA256 with a random salt and 600,000 iterations. The verifier, retry metadata, and biometric preference are stored in native secure storage. Protected feature components are destroyed when the app locks. Theme selection (Light, Dark, Automatic) is stored separately and survives sign-out.

## Android

```bash
sudo apt-get install imagemagick
npm run android:add
npm run android:sync
npm run android:open
```

The Android scaffold has been generated and patched locally. Capacitor skipped web-asset sync because `www/` has not been built, as requested. Run `android:sync` when ready; use `android:add` only on a fresh checkout without the platform. The generated directory is ignored, following Life Leaf's approach.

The `main-android` GitHub workflow auto-bumps versionCode and creates signed or clearly marked unsigned APK and AAB files under `releases/`, plus an R8 mapping and store icon. See [Android build guide](documentation/ANDROID.md) for secrets, release behavior, local commands, and splash sizing.

## Structure

- `core/`: Worker client, session state, guards, interceptor, storage, platform services, theme, local lock, startup.
- `features/`: Dashboard; feature-specific read services and lazy routes; shared collection page; JIRA detail; Login, Unlock, More, Settings.
- `shared/`: navigation, typed response envelopes, safe unknown-field rendering, cards and request states.
- `scripts/`: native patches, assets, versioning, local release collection, signing-key utilities.
- `documentation/`: architecture, auth, API boundaries, Android security and release instructions.

## Integration and validation status

The supplied brief defines endpoint names and the list envelope, but does not contain complete business response schemas or a pagination request parameter. The UI retains unknown fields safely and displays all returned details, without placeholder business data. It reports `hasMore` rather than inventing a cursor parameter. Confirm authenticated response shapes before release; entity-specific field ordering can then be refined centrally.

Source lint, direct PIN cryptography checks, and two native-script tests (version validation and Android patch idempotence) passed. Angular template/type checking and test-source type checking pass with the installed dependencies. The Windows Vitest runner cannot use the WSL-only Rollup binary; a WSL test attempt also stopped because npm was not available to the noninteractive shell. Run npm run test:ci in your configured WSL terminal. No production API calls, app builds, APK builds, commits, or deployments were performed.

Run the WSL checks above, then use [device acceptance checks](documentation/android-security.md#device-acceptance-checks). Responsive visual review and AXE/WCAG verification remain required; no accessibility pass is claimed without running the app.

See [architecture](documentation/architecture.md), [authentication](documentation/authentication.md), [Android security](documentation/android-security.md), and [backend API](documentation/backend-api.md).

The original generated-project setup and tooling notes are preserved in [project setup reference](documentation/project-setup-reference.md).

# Pagination, Work Log reports and Analytics

See [cursor pagination, Print / Export, Android PDF sharing and real Analytics](documentation/PAGINATION-EXPORT-ANALYTICS.md) for usage, Office Pulse reuse, native setup and verification limitations.
