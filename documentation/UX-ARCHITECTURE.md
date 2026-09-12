# UX architecture

Office Orbit presents Worker data as work-management concepts rather than API records.

## Presentation boundary

- Typed client models retain IDs and audit timestamps for internal use.
- Production templates never render Notion IDs, relation ID arrays, `createdTime`, or `lastEditedTime`.
- Supported endpoints request shallow relation enrichment and show names, JIRA keys, and Sprint names.
- Dates use shared human-readable and relative formatters.
- Optional fields and sections are omitted when empty.

## Dashboard

Dashboard makes one request to `GET /api/dashboard`. It shows the current Sprint, four compact JIRA metrics, up to five deduplicated attention items, up to five recent Work Logs, and release/feedback summaries. Detailed collections belong to their feature pages.

## Lists and details

Work Logs offer persistent List and Calendar modes. List mode groups compact activity rows by work date. Metadata-backed Category, Type, and Work Mode controls support multiple selections and use server-side HTTP QUERY filtering. Calendar mode requests the selected month with the same server-side filters, shows per-day counts, and filters the list below when a date is selected. Selecting a Work Log opens an explicit detail sheet with Overview, Related work, Notes, Recognition, and an Edit action only when relevant.

Web printing uses the current Work Log view and filters with a dedicated print layout. Navigation, filters, buttons, internal IDs, and application implementation details are excluded. Native Android printing remains unavailable until a maintained Capacitor-compatible solution is selected.

JIRAs use compact rows and a dedicated detail route. JIRA detail presents chronological Sprint allocation history, Planned Days, allocation conflicts, and Worker-derived spill transitions. Every related Sprint links to its internal detail route. Sprints use navigable capacity cards and proportional progress; Sprint detail shows overview capacity and every JIRA returned by the Worker, regardless of status. Releases use a table/list hybrid with inline disclosure. Feedback rows show the Company-derived Work Type and have a separate Edit action. Work Link cards keep Open link separate from Edit.

## Editors

Work Logs, Feedback, and Work Links use focused Ionic modal editors with typed Reactive Forms. Reactive Forms are used because the native Ionic modal and native multi-select controls integrate directly with their ControlValueAccessor behavior. Required titles, dates, optional URLs, metadata failures, and server failures have visible accessible states. Save is disabled while invalid or pending, modal dismissal is blocked during submission, changed forms warn before dismissal, and focus moves to the first field when the editor opens.

Select controls display Worker metadata names and submit option IDs. Relation controls display names or JIRA key plus summary and submit Notion page IDs. Relation pagination is completed with opaque cursors and selected values are merged back into the options. Feedback Work Type is shown as derived and cannot be edited; Project is absent from Feedback.

## Data volume

Local search is labelled as covering the loaded page. The client stops at the page returned by the Worker when `hasMore` is true because the current route does not accept the returned `nextCursor`. The store retains the opaque cursor and is ready to add forward page caching when the Worker accepts it. See `backend-api.md` for the recommended continuation contract.

## Cache-first navigation

`DataCacheService` memoizes successful responses in memory by endpoint and sorted filter query. Feature pages reuse cached results during the authenticated session. Refresh replaces only the active key. Partial JIRA list and Dashboard records do not seed the richer JIRA detail cache, ensuring Sprint history and spill events are fetched from the detail endpoint. Work Link caching allows all JIRA actions to share the resolved external base URL.

Cache entries expose update timestamps and can be checked as stale after 15 minutes without triggering a request. Sign-out and authenticated 401 handling clear data and navigation state; credentials and tokens never enter the data cache.

## JIRA navigation

JIRA keys use `/app/jiras/:jiraKey` for internal navigation. Sprint references use `/app/sprints/:sprintId`; the active Sprint is determined only by its API `active` flag. Where space permits, an external action is derived from the active `JIRA Base URL` Work Link and opened through the existing platform-safe browser service. Missing configuration hides only the external action.

## Analytics

Analytics is a top-level desktop feature and appears under More on Android. Current Sprint Health distinguishes total Capacity, non-zero Planned Leave and Holidays, Available capacity, Allocated days, and Remaining days. Efficient historical trend charts still require a backend aggregate endpoint rather than downloading full historical collections.

## Responsive shell

Desktop keeps the compact left navigation. Screens at 700 px and below replace it with the five-item bottom navigation: Dashboard, Work Log, JIRAs, Sprints, and More. More contains Releases, Feedback, Work Links, and Settings.

## Current enhancement pass

Cursor pagination, complete month loading, Print / Export, Android PDF sharing and real bounded Analytics are now implemented. See [current behavior and limitations](PAGINATION-EXPORT-ANALYTICS.md); it supersedes earlier first-page/placeholder/Android-print notes above.
