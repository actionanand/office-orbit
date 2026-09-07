# Authentication

The Worker is a single-user backend. Sign in remains disabled until the login form is valid. Office Orbit never persists entered credentials and sends only the password to `POST /api/auth/login`; the Worker returns a Bearer access token and session timing metadata. There is no registration, recovery, OAuth, refresh-token flow, or stored backend password.

Authenticated feature data is cached only in memory. Sign-out and Worker 401 handling clear this cache and saved navigation state together with the authenticated session. The data cache never stores credentials or bearer tokens.

The password exists only in the form and in-flight request; failed attempts clear the password field. Standard username and current-password autofill metadata lets Android's configured password manager offer to save and restore credentials. Passwords and access tokens are never logged or displayed in errors.

## Session storage

Android: native encrypted storage backed by Android Keystore through @aparajita/capacitor-secure-storage. Native operations have a twelve-second deadline. A failed durable save fails the login operation instead of silently creating a memory-only session that disappears when the app closes. A transient read failure presents startup retry instead of incorrectly treating the user as signed out. Tokens are never written to browser storage on Android.

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

## Local lock is separate

Android PIN/biometrics protect local access while a valid Worker session exists. They never create a token, change token expiry, or authenticate to the Worker with an invented password.

Startup verifies the Worker before protected content is shown. Android local lock remains active when needed; renewal is blocked while the local lock is active and is re-evaluated after successful unlock. An expiry timer signs out; guards and unlock methods independently check expiry. A local unlock cannot override a revoked session after a Worker 401.

Sign-out removes only the backend session. Theme and PIN preferences persist. After password reauthentication on a PIN-enabled device, Office Orbit asks whether to keep the existing PIN and biometric configuration or reset device protection. Keeping it resumes the newly authenticated session; resetting it removes the stored PIN and biometric preference. If the backend session is still valid when the app reopens, the login form is skipped and only the local PIN/biometric screen is shown.

## Tests

Mocked tests cover login serialization, session timing storage, invalid credentials/429, session restoration, revoked tokens, renewal outcomes, single-flight renewal, activity/foreground/local-lock renewal guards, renewal failure behavior, interception scope, stale 401s, guards, expired sessions, platform-specific storage, startup and local unlock. They never call the production Worker. Run npm run test:ci after installing dependencies in WSL.
