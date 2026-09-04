# Authentication

The Worker is a single-user backend. The login form requires any nonblank username of up to 12 characters and a password; Sign in stays disabled until both are valid. The username is a local form field, is not persisted, and is not sent to the Worker. Office Orbit sends only the entered password to POST /api/auth/login and accepts a Bearer access token with a positive lifetime. There is no registration, recovery, OAuth or refresh-token flow.

The password exists only in the form and in-flight request; the form is cleared after every sign-in attempt. Passwords and access tokens are never logged or displayed in errors.

## Session storage

Android: native encrypted storage backed by Android Keystore through @aparajita/capacitor-secure-storage. Failure never falls back to browser storage.

Web: sessionStorage, so reloads in the same tab retain the session, subject to browser session-restoration behavior. The native plugin's web localStorage implementation is never used. Application code never writes a token to localStorage.

The stored object contains only the access token and expiration time. Startup validates both metadata and the Worker session through GET /api/auth/status. Expired or corrupt session metadata is removed. Network failures do not authorize protected pages.

## HTTP behavior

The functional interceptor attaches Authorization only to /api/* requests on the exact configured Worker origin, excluding /api/auth/login. It does not attach credentials to links or unrelated hosts.

A protected 401 immediately clears in-memory authentication, clears persisted session state, and routes to Login. Login 401 responses stay on the login form and display an invalid-password message. Stale 401s from a previous session cannot clear a newly established session.

Central error messages cover 400, 401, 404, 429, network and backend failures, without exposing raw backend errors. Password submission and session checks time out after 15 seconds.

## Local lock is separate

Android PIN/biometrics protect local access while a valid Worker session exists. They never create a token, change token expiry, or authenticate to the Worker with an invented password.

Startup verifies the Worker first before allowing the Unlock route. An expiry timer signs out; guards and unlock methods independently check expiry. A local unlock cannot override a revoked session after a Worker 401.

Sign-out removes only the backend session. Theme and PIN preferences persist. Reauthentication on a PIN-enabled device still requires local unlock. If you forget the PIN, there is no invented backend recovery endpoint: resetting Android app data clears local settings and requires a fresh Worker sign-in.

## Tests

Mocked tests cover login serialization, invalid credentials/429, session restoration, revoked tokens, interception scope, stale 401s, guards, expired sessions, platform-specific storage, startup and local unlock. They never call the production Worker. Run npm run test:ci after installing dependencies in WSL.
