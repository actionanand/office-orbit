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

Memo list responses omit bodies. Detail and edit operations fetch Markdown on demand. The editor switches between a monospaced source field and preview while preserving the exact Worker response in Source mode. Memos and Reference Library use the same preview engine and enhancement pipeline:

1. A client-side Notion normalizer converts deterministic Notion output into Markdown that Marked can consume. It supports the known `table`/`tr`/`td` table vocabulary, tab-indented lists, recoverable nested blockquotes, list-contained code fences, a small safe inline-HTML allowlist, definition lists, and standard or observed Notion footnote forms.
2. Marked renders standard and GitHub-Flavored Markdown, including headings, paragraphs, emphasis, lists, task lists, rules, links, images, blockquotes, code fences, and tables.
3. Prism highlights scoped fenced-code elements without changing their source. Initially supported languages and aliases are JavaScript (`javascript`, `js`), TypeScript (`typescript`, `ts`), HTML (`html`, `markup`), CSS, JSON, Bash (`bash`, `shell`, `sh`), and plain text (`text`, `plaintext`, `plain`). Mermaid fences are excluded from Prism. Highlighted blocks provide an Ionicon Copy action that copies their original text.
4. KaTeX renders `$...$` and `$$...$$` expressions, including expressions inside normalized table cells. Math inside inline or fenced code remains literal.
5. Mermaid renders responsive diagrams from explicit `mermaid` fences with strict security. A failed diagram retains its source and displays an accessible warning.

Angular continues to sanitize Marked output. The client does not use a sanitizer bypass. Unsafe links are disabled, external links use `noopener noreferrer`, and Mermaid SVG is defensively filtered. Supported restored HTML is restricted to `strong`, `em`, `mark`, `sub`, `sup`, `details`, `summary`, `kbd`, and `br`; only `open` is accepted on `details`. Arbitrary HTML is intentionally unavailable.

Reference Library content is Notion enhanced Markdown, so the preview cannot promise a lossless GFM round trip. Notion may map H5 and H6 to H4, discard original table alignment, or lose some escaped-character intent. The client preserves malformed upstream LaTeX visibly and does not guess at repairs. Normalization only affects Preview and never mutates the stored Markdown or Source view.

Before Marked, Preview disambiguates a standalone `---` directly adjoining content on both sides by inserting blank lines around it. This handles Notion's packed paragraph/separator/next-block serialization. Backtick and tilde fences (including longer closing fences) are protected. Conventional Setext headings with a blank line after the underline, or at end of input, remain unchanged, as do explicit `##` headings. A Setext heading immediately followed by content without a blank line is inherently ambiguous; this specific Preview pattern favors Notion separators. Source continues to show the raw API Markdown. This compatibility rule belongs in the shared client renderer; the Worker remains transport-focused.

To check the existing **Markdown Feature Demo**, open Productivity → Reference Library → Markdown Feature Demo:

1. In Preview, verify the description below the title is a normal paragraph followed by a horizontal rule, and “1. Headings” remains H1.
2. Verify the rule after Heading Level 6 and the three separators in section 10.
3. Switch to Source and compare with the API response: the original Markdown, including separator spacing, must remain unchanged. Switch back to Preview.
4. Check Mermaid diagrams, inline and block math, code highlighting and code Copy actions, table borders and bold cell content.
5. Check nested lists and blockquotes on desktop and a narrow mobile viewport. Repeat a representative Markdown preview in Memos to check the shared renderer.

Reference Library is backed by the Worker's Notion data source and remains read/import only: there is no edit, delete, or bulk delete. Rows use Article as their title and show live Category, Tags, and Last Edited values. Category and Tag controls come from `/api/reference-library/meta`. Unfiltered All uses cursor-paginated GET; Category, Tags, and debounced article search use server-side `QUERY /api/reference-library`, preserving the exact filter set for opaque-cursor Load more. Optional Category grouping applies only to the currently loaded rows.

Preview Markdown reads a validated `.md` or `.markdown` file with `File.text()` and displays it through the same Markdown viewer in a local Ionic modal. Its Source tab shows the exact file contents. The filename and contents remain in page signals only, are cleared when the modal closes or the page is destroyed, and are never uploaded, cached, persisted, or logged. Import Markdown remains the separate upload workflow. Rendered images with non-empty alt text use that text as a caption; blank alt text remains captionless.

Imports accept a non-empty `.md` or `.markdown` file no larger than 4,500,000 bytes. The optional Title, Category, and Tags form sends live Category/Tag option IDs as multipart `FormData`; a cleared title is omitted so the Worker can derive it. The browser or Android WebView supplies the multipart boundary. HTTP 201 completes immediately; HTTP 202 uses `pollAfterSeconds`, reports queued/running/retrying state, and stops on success, failure, navigation/destroy, or the ten-minute safety limit. Successful imports invalidate both GET and filtered QUERY cursor caches.

## Simple JIRA creation

The JIRA list exposes an Add JIRA modal. It loads Status and Tag option IDs from `/api/jiras/meta`, follows the metadata-provided Project relation endpoint, and sends the allow-listed create body to `POST /api/jiras`. The Active Sprint, Demo Required, and Appraisal values are explicit checkboxes. Duplicate keys and active-Sprint configuration conflicts remain visible in the form. This client flow is create-only; JIRA edit and delete stay in Notion.
