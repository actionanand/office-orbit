# Worker API boundary

Production base: `https://work-tracker-api.techie-ar.workers.dev`.
Development base: `http://localhost:8787`.

Only the Worker is called. The application has no Notion API client or backend secrets.

## Authentication

- POST /api/auth/login — JSON body with password only; response accessToken, tokenType and expiresIn.
- GET /api/auth/status — authenticated, subject, expiresAt.
- GET / and OPTIONS are public; other /api/* calls require a Bearer token.
- Login 400/401/429 and authenticated 401s are handled separately.

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

The Worker returns `hasMore` and `nextCursor`, but its collection routes do not accept `cursor` or `pageSize`. Office Orbit therefore does not fake pagination or download all history. The client retains the returned cursor for future forward pagination and caches the first response by endpoint and filters. The exact recommended backend enhancement is `GET /api/<resource>?pageSize=25&cursor=<opaqueNotionCursor>`, with the cursor passed to Notion as `start_cursor`, while preserving filters, sort order, response envelope, and opaque cursor semantics.

There is no aggregate Analytics endpoint. Trend charts for Sprint spillovers, blockers, delivery, demos, Work Logs, appraisal items, and releases require server-side grouping and bounded time-series responses before production charts can be added efficiently.

## Error behavior and security

UI states cover loading, empty collections, retryable errors and partial lists. Request cancellation prevents obsolete responses from changing a newer collection view. JIRA keys are URL-encoded. External links accept HTTP(S) only, without embedded credentials. Text is rendered through Angular interpolation; the app never inserts Worker HTML.

No backend write support, refresh endpoints, password recovery endpoints or Notion calls are invented.
