# Architecture

Office Orbit uses Angular 22 standalone components and automatic @Service providers, Ionic 9 components from the package root, and Capacitor 8. Existing package versions are preserved.

## Startup and navigation

StartupService initializes the theme and native lock metadata, restores the Worker session, verifies /api/auth/status, then marks startup ready. A loading shield appears while this runs. Startup errors leave authentication unverified and offer Retry. Corrupt security metadata is never treated as a disabled lock.

Functional guards check startup, Worker authentication and local-lock state. Each protected child route is guarded. The responsive ShellComponent hosts an ordinary Angular RouterOutlet so feature views are destroyed instead of being retained by Ionic's navigation stack. Its signal condition removes protected DOM as soon as the app locks or the session ends.

Android uses a five-item bottom navigation; desktop uses a sidebar. More links to releases, feedback, links and settings. The same lazy feature routes serve both platforms. Route changes move keyboard focus to the page heading.

## State

Signals hold session, lock, request and theme state; computed signals derive visibility and filtered records. HttpClient/RxJS handle requests and cancellation. No NgRx, business-data persistence, or write endpoints are introduced.

Ionic 9 IonInput exposes a ControlValueAccessor rather than a Signal Forms value model in this installation. Password/PIN forms therefore use typed Reactive Forms, with signal-based UI state, as the specified fallback. Native date filters also use Reactive Forms to keep one form strategy.

## API boundary

Each collection has a feature-specific service and view allowlist. ReadFeatureService and ResourceService share request/envelope handling. Dashboard has its own service; JiraService also fetches JIRA details.

The only fully specified business contract in the brief is the list envelope. Record fields are represented as Readonly<Record<string, unknown>>, checked before display. The renderer retains all returned fields in expandable details and displays nested relations safely as text. No raw HTML is trusted. Values absent from the server are not fabricated.

Collection requests cancel when a user changes views or leaves the page, preventing stale responses from replacing a newer view. Lists show loading, empty, error and server-has-more states. Cursor continuation is intentionally not guessed because the request contract was not supplied.

## Platform abstractions

- PlatformService detects Android.
- NativeStorageService imports the Keystore storage plugin only for Android.
- TokenStorageService routes native session storage versus web sessionStorage.
- BiometricService checks enrolled strong biometrics and performs local authentication.
- LinksService permits only HTTP(S), opens Android Custom Tabs through Capacitor Browser, and uses noopener/noreferrer on web.
- ThemeService applies Ionic CSS variables and observes system-theme changes in Automatic mode.

The Worker and its backing storage are unchanged. See authentication.md for security boundaries and ANDROID.md for native generation.
