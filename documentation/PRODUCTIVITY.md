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

Memo list responses omit bodies. Detail and edit operations fetch Markdown on demand. The editor switches between a monospaced source field and preview while preserving the original source. A shared Marked renderer supports standard Markdown for both Memos and Reference Library. Explicit `mermaid` fences render responsive diagrams with Mermaid strict security, while `$...$` and `$$...$$` render inline and block formulas with KaTeX. Code fences and inline code remain literal. Angular sanitizes generated Markdown HTML; unsafe links are disabled, Mermaid SVG is defensively filtered, and no sanitizer bypass is used.

Reference Library is backed by the Worker's Notion data source and remains read/import only: there is no edit, delete, or bulk delete. Rows use Article as their title and show live Category, Tags, and Last Edited values. Category and Tag controls come from `/api/reference-library/meta`. Unfiltered All uses cursor-paginated GET; Category, Tags, and debounced article search use server-side `QUERY /api/reference-library`, preserving the exact filter set for opaque-cursor Load more. Optional Category grouping applies only to the currently loaded rows.

Imports accept a non-empty `.md` or `.markdown` file no larger than 4,500,000 bytes. The optional Title, Category, and Tags form sends live Category/Tag option IDs as multipart `FormData`; a cleared title is omitted so the Worker can derive it. The browser or Android WebView supplies the multipart boundary. HTTP 201 completes immediately; HTTP 202 uses `pollAfterSeconds`, reports queued/running/retrying state, and stops on success, failure, navigation/destroy, or the ten-minute safety limit. Successful imports invalidate both GET and filtered QUERY cursor caches.

## Simple JIRA creation

The JIRA list exposes an Add JIRA modal. It loads Status and Tag option IDs from `/api/jiras/meta`, follows the metadata-provided Project relation endpoint, and sends the allow-listed create body to `POST /api/jiras`. The Active Sprint, Demo Required, and Appraisal values are explicit checkboxes. Duplicate keys and active-Sprint configuration conflicts remain visible in the form. This client flow is create-only; JIRA edit and delete stay in Notion.
