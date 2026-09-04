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

ResourceService checks the envelope, tolerates bare arrays and single record responses, and retains object fields as unknown until their type is checked for display. Authentication has separate typed models. Dashboard displays each returned section and numeric top-level summaries; absent values remain absent.

Full authenticated sample payloads were not supplied, so nested field ordering and entity-specific relation presentation still need confirmation against real responses. No authenticated requests were made during implementation.

The brief does not specify the incoming cursor parameter or which endpoints accept include=relations. The app deliberately sends neither. It reports when the server indicates additional records. Confirm that contract before adding load-more or relation-expansion requests.

## Error behavior and security

UI states cover loading, empty collections, retryable errors and partial lists. Request cancellation prevents obsolete responses from changing a newer collection view. JIRA keys are URL-encoded. External links accept HTTP(S) only, without embedded credentials. Text is rendered through Angular interpolation; the app never inserts Worker HTML.

No backend write support, refresh endpoints, password recovery endpoints or Notion calls are invented.
