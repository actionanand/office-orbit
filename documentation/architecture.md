# Architecture

Office Orbit uses Angular 22 standalone components and automatic @Service providers, Ionic 9 components from the package root, and Capacitor 8. Existing package versions are preserved.

## Startup and navigation

StartupService initializes the theme and native lock metadata, restores the Worker session, verifies /api/auth/status, then marks startup ready. A loading shield appears while this runs. A 20-second startup deadline prevents unresolved native plugin calls from leaving the application on an endless spinner. Startup errors leave authentication unverified and offer Retry. Corrupt security metadata is never treated as a disabled lock. AuthService owns sliding session timing and renews through /api/auth/renew only during recent foreground activity.

Functional guards check startup, Worker authentication and local-lock state. Each protected child route is guarded. The responsive ShellComponent hosts an ordinary Angular RouterOutlet so feature views are destroyed instead of being retained by Ionic's navigation stack. Its signal condition removes protected DOM as soon as the app locks or the session ends.

Android uses a five-item bottom navigation; desktop uses a sidebar. More links to releases, feedback, links and settings. The same lazy feature routes serve both platforms. Route changes move keyboard focus to the page heading.

## State

Signals hold session, renewal, foreground/activity, lock, request and theme state; computed signals derive visibility and filtered records. HttpClient/RxJS handle requests and cancellation. No NgRx, business-data persistence, or write endpoints are introduced.

Ionic 9 IonInput exposes a ControlValueAccessor rather than a Signal Forms value model in this installation. Password/PIN forms therefore use typed Reactive Forms, with signal-based UI state, as the specified fallback. Native date filters also use Reactive Forms to keep one form strategy.

## API boundary

Each collection has a feature-specific service and view allowlist. ReadFeatureService and ResourceService share request/envelope handling. Dashboard has its own service; JiraService also fetches JIRA details.

The client models the Worker's documented domain contracts for JIRAs, Work Logs, Sprints, Sprint Allocations, Releases, Feedback, Work Links, and Dashboard. Production views render explicit domain fields. There is no generic object renderer or expandable property dump. Internal IDs and raw API timestamps remain available only to TypeScript for routing, filtering, and relation matching.

Supported collection endpoints request `include=relations`, allowing the UI to show Project, Company, Team, Sprint, and JIRA names without displaying Notion page IDs. Sprint Allocation endpoints do not support enrichment, so their existing human-readable allocation title is shown without exposing relation IDs.

Collection requests cancel when a user changes views or leaves the page, preventing stale responses from replacing a newer view. Lists use compact, domain-specific rows with layout-matched skeletons and contextual empty states. Work Logs remain bounded to the first server page. Search explicitly covers the loaded page only because the Worker returns `nextCursor` but does not accept a continuation cursor.

## Platform abstractions

- PlatformService detects Android.
- NativeStorageService imports the Keystore storage plugin only for Android.
- TokenStorageService routes native session storage versus web sessionStorage and stores non-secret session timing metadata with the access token.
- BiometricService checks enrolled strong biometrics and performs local authentication.
- LinksService permits only HTTP(S), opens Android Custom Tabs through Capacitor Browser, and uses noopener/noreferrer on web.
- ThemeService applies Ionic CSS variables and observes system-theme changes in Automatic mode.

The Worker and its backing storage are unchanged. See authentication.md for security boundaries and ANDROID.md for native generation.
