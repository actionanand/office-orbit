# Authentication

The Worker is a single-user backend. Sign in remains disabled until the login form is valid. Office Orbit sends the password as the only authentication secret, together with non-security device display metadata, to `POST /api/auth/login`; the Worker returns a Bearer access token and session timing metadata. There is no registration, recovery, OAuth, refresh-token flow, or stored backend password. Office Orbit itself never persists the entered password; on Android, the user may consent to storing it with the device's credential provider.

Each password login also sends non-security display metadata: a stable random Office Orbit installation ID, friendly device/browser name, platform, optional Android model, and the version from `app-version.ts`. The username field remains an autofill/password-manager aid and is not added to the Worker authentication contract. Android keeps the installation ID under the dedicated `office-orbit.installation-id` secure-storage key, with the app-private WebView store as a non-blocking fallback. Web stores it as `office-orbit.device-id` in localStorage. An uninstall or browser storage reset may generate a new ID. Tokens, session IDs, usernames, IP addresses, and sensitive hardware identifiers are never used as device IDs. Android device-info failure falls back to `Android device`; browser labels use small, conservative User-Agent detection and are not treated as security evidence.

Authenticated feature data is cached only in memory. Sign-out and Worker 401 handling clear this cache and saved navigation state together with the authenticated session. The data cache never stores credentials or bearer tokens.

The password exists only in the form, the in-flight Worker request, and the short native call to the user's credential provider; failed attempts clear the password field. Standard `username` and `current-password` autocomplete metadata remains on the form.

On Android, the native `OfficeOrbitCredentials` Capacitor plugin uses AndroidX Credential Manager. Only after the Worker accepts the password does it send the username and password to `CreatePasswordRequest`, allowing Google Password Manager or another configured provider to offer a save or update. Cancellation, no provider, and native failure never change the successful login result. Office Orbit does not copy the password into Preferences, IndexedDB, SecureStorage, files, SQLite, or its own Keystore data.

The Android-only **Use saved credentials** action requests a `PasswordCredential` through the same provider. A selected credential fills the username and masked password controls; it never submits the form. The user must press **Sign in**, and the Worker remains the authentication authority. Cancellation is silent, while absence or provider failure produces a non-technical message. WebView autofill remains enabled with `IMPORTANT_FOR_AUTOFILL_YES`, but the old WebView `navigator.credentials.store()` and delayed-navigation heuristic are no longer used on Android.

On Web, ordinary browser autocomplete/password-manager behavior remains. Where the browser exposes the Credential Management API, the existing post-success save offer remains a best-effort fallback. It is never routed through the Android plugin. Passwords and access tokens are never logged or displayed in native errors.

## Session storage

Android: native encrypted storage backed by Android Keystore through @aparajita/capacitor-secure-storage. Native operations have a three-second deadline, retried once after a short backoff to absorb a Keystore that is briefly unavailable right after process start. The session and PIN reads run concurrently at startup rather than sequentially, so a slow or unresponsive Keystore only costs its own latency once instead of twice. If the Keystore-backed store never succeeds, the session token durably falls back to the same app-private IndexedDB store already used for the PIN, so sign-in still survives closing and reopening the app; this fallback tier is protected by normal Android app sandboxing rather than hardware Keystore encryption. Only if that fallback also fails does a login degrade to a memory-only session for that launch (same behavior as web), with the user told the session will not survive closing the app. A transient read failure keeps a locally unexpired session; a persistent failure still lets the user reach the Worker login screen rather than trapping the app. Tokens are never written to browser storage on Android.

Web: sessionStorage, so reloads in the same tab retain the session, subject to browser session-restoration behavior. The native plugin's web localStorage implementation is never used. Application code never writes a token to localStorage.

The stored object contains only the access token and non-secret session timing metadata: `expiresAt`, `renewAfter`, optional `sessionStartedAt`, and `sessionExpiresAt`. Startup validates restored tokens through GET /api/auth/status and restores server-provided timing metadata. Expired, absolute-session-expired, corrupt, or server-revoked sessions are removed. During a temporary connection failure, a securely stored and locally unexpired Android session continues behind the configured PIN or biometric lock; protected API calls still reject revoked tokens with a 401.

## Sliding sessions

Access tokens last about 1 hour. During active use, Office Orbit may renew the token through protected `POST /api/auth/renew` when the Worker-provided `renewAfter` time has arrived. The app never decodes JWTs for timing, never sends a request body for renewal, and never renews an expired token.

Renewal is silent when it succeeds. If the Worker returns `renewed: false`, the current token is kept and any returned timing metadata is stored. A successful renewal does not clear Dashboard, Work Log, JIRA, Release or other feature caches because the session is continuous.

The Worker controls the maximum authenticated session, currently 8 hours from the original password login. Office Orbit respects `sessionExpiresAt` and requires the Worker password again when that limit is reached. PIN and biometric unlock are local app-lock checks only; they do not renew or recreate backend authentication.

Renewal only runs while the app is foregrounded and the user has interacted with Office Orbit within the active session window. Activity includes route navigation, pointer/button interaction, keyboard interaction, Android resume, and normal authenticated API use. The client schedules lightweight local checks around `renewAfter`; it does not poll the Worker or call renew on every HTTP request.

## HTTP behavior

The functional interceptor attaches Authorization only to /api/* requests on the exact configured Worker origin, excluding /api/auth/login. It includes the current token on /api/auth/renew and does not attach credentials to links or unrelated hosts.

A protected 401 immediately clears in-memory authentication, clears persisted session state, clears authenticated caches, and routes to Login. Login 401 responses stay on the login form and display an invalid-password message. Stale 401s from a previous session cannot clear a newly established session.

Temporary renewal failures such as offline, timeout, or 5xx keep the current token while it is still valid. The app backs off and tries again only on later meaningful activity, visibility, resume, or scheduled local evaluation. When the current token or absolute session expires, password sign-in is required.

Central error messages cover 400, 401, 404, 429, network and backend failures, without exposing raw backend errors. Password submission and session checks time out after 15 seconds.

## Active sessions and explicit logout

Settings offers **Show all active sessions**. The active-session component is created only after that action, then requests `GET /api/auth/sessions` once. Closing destroys the component and cancels an unfinished list request. Reopening creates fresh state and performs one fresh request. There is no startup fetch, Settings-initialization fetch, background polling, or automatic retry; Retry is an explicit additional request.

The modal uses the Worker's `current` field as the sole current-device marker. It shows friendly platform/device metadata, country, application version, and recent activity without exposing installation IDs, IP addresses, or access tokens. Revoking another session calls the URL-encoded `DELETE /api/auth/sessions/:sessionId` and removes only that row locally. **Log out from all other devices** calls `POST /api/auth/sessions/logout-others` and retains only the server-marked current session locally. Neither action performs a refresh GET.

Revoking the current row clears the local session and routes to Login after the Worker confirms `currentSession: true`. The normal Settings **Sign out** action first attempts `POST /api/auth/logout`, then always performs the existing local cache, navigation-state, token-storage, and authentication cleanup. A network failure cannot trap the user: local sign-out completes with a notice that the server session may remain until expiry. Automatic expiry, renewal failure, startup recovery, and interceptor 401 cleanup continue to use local-only cleanup and never call the logout endpoint unnecessarily. Server-side revocation makes a revoked bearer token unusable immediately; the client does not infer that state from the installation ID.

## Local lock is separate

A local app lock protects access while a valid Worker session exists. It never creates a token, changes token expiry, or authenticates to the Worker with an invented password. A PIN is supported on both Web and Android; biometric unlock is Android-only and always requires a configured PIN as fallback.

PIN verifier storage is platform-specific and selected explicitly, without probing native storage on the web first. Android stores the salted PIN verifier in Keystore-backed secure storage (with the app-private IndexedDB security store as a fallback). Web stores the verifier directly in the same IndexedDB security store. Neither path stores a plaintext PIN.

Startup verifies the Worker before protected content is shown. The local lock remains active when needed; renewal is blocked while the local lock is active and is re-evaluated after successful unlock. An expiry timer signs out; guards and unlock methods independently check expiry. A local unlock cannot override a revoked session after a Worker 401.

On Android, resuming the app only signs out a session that actually existed; resuming while still on the login screen (no session was ever established) is a no-op and does not attempt to clear storage.

A PIN-enabled device (Web or Android) may also lock automatically after a configurable period of inactivity (off, 1, 5, or 10 minutes), on top of the existing cold-launch and Android background/resume locks. Settings also offers an explicit "Lock now" action. Both preferences are non-secret device settings and do not affect the backend session.

### Startup routing and recovery

After initialization the app routes deterministically and guards enforce the same rules independently, so a deep link to a protected route obeys them too: no valid session goes to `/login`; a valid session with a locked PIN goes to `/unlock`; otherwise `/app/dashboard`. A local PIN, storage, or biometric initialization problem never blocks an unauthenticated user from reaching the Worker login screen — startup fails closed to `/login` rather than a blocking error. Local security failures are reported distinctly from connection failures instead of a single generic "check your connection" message. If a valid session exists but a configured protection record cannot be read or parsed, the app does not display protected content: it clears the unreadable record and requires Worker password reauthentication (a safe recovery), never a silent bypass.

Sign-out removes only the backend session. Theme and PIN preferences persist. After password reauthentication on a device that still has a configured PIN, Office Orbit asks whether to keep the existing protection or reset it. On Android the prompt covers the PIN and biometric preference; on Web it covers the PIN only, with no biometric wording. Keeping it resumes the newly authenticated session; resetting it removes the stored PIN (and, on Android, the biometric preference). If the backend session is still valid when the app reopens, the login form is skipped and only the local unlock screen is shown. A PIN or biometric can never recreate a missing or expired backend session; when the token or absolute session is gone, the Worker password is required again.

## Android WebView origin and CORS

Capacitor runs the Android app with `androidScheme: 'https'`, so the WebView origin is `https://localhost`. The Worker at the configured `apiBaseUrl` must allow that origin: its CORS policy must permit `https://localhost` (and, for the emulator development flow, any dev origin used), reflect it in `Access-Control-Allow-Origin`, allow the `Authorization` and `Content-Type` request headers, and answer `OPTIONS` preflight for `/api/auth/*` and other protected routes. Do not loosen CORS to `*` for authenticated requests. The Worker source is not part of this repository; if Android sign-in fails with a network/CORS error while the site works in a browser, verify the Worker allows the `https://localhost` origin.

## Tests

Mocked tests cover login serialization, session timing storage, invalid credentials/429, session restoration, revoked tokens, renewal outcomes, single-flight renewal, activity/foreground/local-lock renewal guards, renewal failure behavior, interception scope, stale 401s, guards, expired sessions, platform-specific storage, startup, startup recovery from an unreadable protection record, an unauthenticated user still reaching sign-in after a startup failure, cross-platform (Web and Android) PIN behavior, corrupt/unsupported PIN records, and local unlock. They never call the production Worker. Run npm run test:ci after installing dependencies in WSL.
