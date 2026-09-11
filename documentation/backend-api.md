# Worker API boundary

Production base: `https://work-tracker-api.techie-ar.workers.dev`.
Development base: `http://localhost:8787`.

Only the Worker is called. The application has no Notion API client or backend secrets.

## Authentication

- POST /api/auth/login — JSON body with password and non-security device display metadata; response accessToken, tokenType, expiresIn, and optional expiresAt, renewAfter, sessionExpiresAt.
- POST /api/auth/renew — protected Bearer request with no request body; response either renewed=true with a replacement accessToken or renewed=false with updated timing metadata.
- GET /api/auth/status — authenticated, subject, expiresAt, renewAfter, optional sessionStartedAt, sessionExpiresAt.
- GET /api/auth/sessions — protected active-session list, requested only when the user opens Settings → Active sessions.
- DELETE /api/auth/sessions/:sessionId — revoke one selected session; the client URL-encodes the session ID.
- POST /api/auth/sessions/logout-others — revoke every session except the server-identified current session.
- POST /api/auth/logout — revoke the current server session during an explicit Settings sign-out.
- GET / and OPTIONS are public; other /api/* calls require a Bearer token.
- Login 400/401/429 and authenticated 401s are handled separately.

Device metadata contains a random installation ID, friendly device/browser name, platform, optional model, and the existing application version. It is display and deduplication metadata only. Android stores the generated installation ID through the existing secure-storage wrapper with an app-private fallback; Web stores it under `office-orbit.device-id`. No hardware identifier, username, token, session ID, or IP address is used as the installation ID.

The active-session list is never requested by startup, login, status validation, renewal, Settings initialization, background activity, or polling. The modal fetches once each time the user opens it and may fetch again only when the user presses Retry. Successful revocations update the modal's local state without another list request.

## Read features

| Service          | Paths used                                                                                          |
| ---------------- | --------------------------------------------------------------------------------------------------- |
| DashboardService | /api/dashboard                                                                                      |
| JiraService      | /api/jiras, /active, /blocked, /spillovers, /appraisal, /demo-pending, /demoed; /api/jiras/:jiraKey |
| WorkLogService   | /api/work-logs, /appraisal                                                                          |
| SprintService    | /api/sprints, /active, /history; /api/sprint-allocations, /current                                  |
| ReleaseService   | /api/releases, /pending, /confirmed, /not-announced                                                 |
| FeedbackService  | /api/feedback, /appraisal, /improvement-follow-up, /negative                                        |
| WorkLinksService | /api/work-links, /active                                                                            |

Suffixes in the table attach to the preceding collection. The default JIRA view is active; the default links view is active. The Work Log sends from/to only when dates are entered. DashboardService accepts optional companyId/projectId filters.

Companies, teams and projects endpoints from the brief are available for future lookup filters; the current navigation does not add unsupported entity editors. No POST/PUT/PATCH/DELETE business actions exist.

## Response handling

The specified list response is:

```ts
interface ListResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
}
```

ResourceService checks the envelope and tolerates bare arrays and single record responses. Authentication has separate typed models. Dashboard consumes only `/api/dashboard`, renders four summary metrics, deduplicates its attention preview, and limits recent Work Logs to five visible items. It does not fetch full feature collections.

The Worker's local source and knowledge-base contracts confirm `include=relations` support for JIRAs, Work Logs, Sprints, Releases, Feedback, and Work Links. Office Orbit sends that option for supported collection and JIRA detail requests, then renders only human-readable relation names and keys.

The Worker accepts `pageSize` (default 25, maximum 100) and opaque `cursor`. CursorService retains appended pages by filter context; Refresh resets only the active chain. Calendar and exports follow all cursors within explicitly bounded date ranges.

Work Activity analytics use bounded Work Logs and local aggregation. Historical Sprint health still requires a Worker aggregate endpoint. See [pagination, reports and analytics](PAGINATION-EXPORT-ANALYTICS.md).

## Error behavior and security

UI states cover loading, empty collections, retryable errors and partial lists. Request cancellation prevents obsolete responses from changing a newer collection view. JIRA keys are URL-encoded. External links accept HTTP(S) only, without embedded credentials. Text is rendered through Angular interpolation; the app never inserts Worker HTML.

No backend write support, refresh tokens, password recovery endpoints or Notion calls are invented.
