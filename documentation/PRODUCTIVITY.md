# Productivity client

Office Orbit exposes one Productivity navigation entry with four lazy child areas: To Do, Tasks & Follow-ups, Memos, and Reference Library. The default `/app/productivity` route redirects to `/app/productivity/todos`; the same entry appears naturally in the mobile More page.

## Server-side views and pagination

To Do, Tasks, and Memos send literal authenticated HTTP `QUERY` requests for filtered views and debounced search. Each body contains `filters`, `pageSize: 25`, an opaque `cursor`, and `includeRelations` (`true` for Tasks). Changing a view or search creates a new cursor chain. Load more preserves the exact filters, prevents duplicate continuation requests, and deduplicates returned IDs. The unfiltered All views retain paginated GET.

The Task and Work Log editors share a JIRA picker backed by `QUERY /api/jiras/options`. Opening it requests only the first 20 current-Sprint JIRAs. Entering at least two characters searches all JIRAs by key or summary on the Worker; the client never loads the complete JIRA database or searches it locally. Load more follows one opaque cursor at a time. Multiple selections are supported, and selected historical or non-Sprint JIRAs remain visible when search is cleared or results change. Company and Project options continue through `RelationOptionsService`.

To Do provides All, Open, Today, Upcoming, and Done. Tasks provides All, Active, My Tasks, From Seniors, Delegated, Waiting On, Follow-up, Overdue, and Done. Memos provides All, Pinned, Commands, Prompts, and Recently Updated. Date filters use the local calendar day.

## Writes and deletion

Editors load writable option IDs from each resource's `/meta` route. Task Company and Work Log Project pickers follow their relation option endpoints. Quick completion looks up the Done option ID dynamically; completing a Task fills an empty Completed Date with local today, while reopening clears it. Optional editor dates stay visibly blank until the user applies a date; clearing one sends `null`.

To Do, Tasks, and Memos support confirmed single deletion and selection-mode bulk deletion. A bulk request is capped at 25 IDs and uses one `/bulk-delete` request. Partial failures refresh the list and report both deleted and failed counts. Successful mutations invalidate GET and QUERY cursor caches.

## Markdown and Reference Library

Memo list responses omit bodies. Detail and edit operations fetch Markdown on demand. The editor switches between a monospaced source field and preview while preserving the original source. Preview rendering converts headings, emphasis, strike, inline and fenced code, links, lists, nested indentation, quotes, and checklists into typed Angular template blocks. Raw HTML and code remain text, unsafe URL schemes are not linked, and no sanitizer bypass is used. Detail pages can also switch between preview and the original source.

Reference Library supports paginated list, detail, and Markdown import only. It intentionally has no edit, delete, bulk delete, or QUERY controls. Imports accept a non-empty `.md` or `.markdown` file no larger than 4,500,000 bytes. The browser or Android WebView supplies the multipart boundary. HTTP 201 completes immediately; HTTP 202 uses `pollAfterSeconds`, reports queued/running/retrying state, and stops on success, failure, navigation/destroy, or the ten-minute safety limit.
