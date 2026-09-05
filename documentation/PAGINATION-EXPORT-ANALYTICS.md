# Cursor pagination, reports and analytics

## Client architecture

ResourceService handles typed transport. CursorService owns the loaded list, opaque cursor chain, deduplication, request sharing and timestamps. ReadFeatureService delegates all collection views to it. Lists request pageSize=25 and append only after an explicit Load more action. The current page count is never presented as a total. No numeric pagination is used.

Supported screens: Work Logs, every JIRA view, Releases, Feedback, Sprint history/current Sprints, Sprint Allocations and Work Links. A filter change starts a separate query; returning to a cached context restores all its loaded records. Refresh discards the active query's chain and fetches its first page. Other feature caches remain intact.

The Worker contract is GET /api/<resource>?pageSize=25&cursor=<opaqueNotionCursor>. Maximum pageSize is 100. All filter parameters stay unchanged when following the cursor. Missing/repeated continuation cursors fail visibly instead of silently truncating the results.

Calendar mode requests the selected month's from/to with pageSize=100 and follows all cursors within that month. Complete months are cached separately. The Appraisal calendar uses the bounded main Work Log route and filters matching month records locally because the appraisal route ignores date filters.

## Work Log Print / Export

The entry point opens an Ionic options modal (a sheet-sized presentation on phones). Presets include Today, This week (Monday–Sunday), This month, Previous month, Current Sprint and Custom. Current Sprint dates come from the cached Dashboard. Missing sprint dates require a custom period. Date validation prevents invalid/reversed/unbounded ranges.

Categories are Office Work, Freelancing and Grooming. At least one category is required. One selected category produces one paginated bounded query; two produce two complete bounded query chains. All three omit category for a single chain. Results are deduplicated internally by ID and sorted by date descending. Export arrays are temporary and do not populate the normal list cache.

Content options control comments, went-wrong notes, organization names, JIRA keys and appraisal indicators. Internal IDs, cursors and system timestamps never enter the report model. Empty results produce a message, not an empty file. Progress is announced and duplicate submissions are disabled.

## Blank print diagnosis and fix

The prior printable list lived inside ion-content. Global print CSS changed light-DOM ancestors but did not remove Ionic's shadow-root scroll container and fixed/constrained page geometry. This was a structural risk for blank printing; the exact browser failure could not be reproduced in this Windows environment.

ReportOutputService now creates a separate same-origin iframe document from an escaped report template, outside the Ionic application tree. It waits for document load, font readiness and two animation frames before invoking that document's print method. The document remains alive through print preview. Its CSS has white paper, readable text, A4 margins and record break avoidance. It contains no application shell or hidden Angular print container.

Web Export PDF creates an actual application/pdf Blob and downloads office-orbit-work-log-FROM-to-TO.pdf. No third-party PDF package is required. The browser renderer lays out Unicode text onto high-resolution pages and embeds those pages in a PDF with page numbers. This preserves visual text but produces raster pages: text is not selectable/searchable or tagged for PDF screen readers. Browser Print remains available for native browser text output.

## Office Pulse Android implementation reused

Exact reference files:

- C:/AR_Files/code/office-pulse/src/app/services/pdf-export.service.ts
- C:/AR_Files/code/office-pulse/scripts/patch-android-export.mjs
- C:/AR_Files/code/office-pulse/package.json

Office Pulse uses no PDF generation dependency or Capacitor Filesystem plugin. It registers a custom OfficePulseExport plugin, draws with Android PdfDocument, writes into getCacheDir()/exports, sanitizes filenames, and shares through FileProvider and ACTION_SEND with FLAG_GRANT_READ_URI_PERMISSION. It does not request broad storage permissions. Its Web path only opens browser Print; it does not provide a separate Web Blob PDF download.

Office Orbit reuses that pattern as OfficeOrbitExport. scripts/patch-android-export.mjs generates the native plugin, registers it before BridgeActivity startup and creates a dedicated .exportprovider authority exposing only cache exports/. The existing android:patch step invokes it in local and GitHub builds. Long one-column report records can continue across native PDF pages; page numbers are included. Native files are temporary app-cache files: users choose a destination through Android's share/save chooser. No Android API-version-specific storage permission is required.

After changing native sources, run npm run android:sync (or build, cap sync android, then npm run android:patch). Running only cap sync does not run this project's generated-source patch step. No new package installation is needed.

## Analytics

Analytics uses bounded Work Log ranges: 30 days, 90 days, six months or Custom. It follows the range's server cursors, then caches the small aggregation result by date range. Native Angular SVG bars display weekly counts, category mix and type mix, with visible textual values. Theme variables support Light/Dark/Automatic. No chart library was added.

Cached Dashboard data supplies current sprint capacity/allocated/remaining days and active/blocked/spillover/demo-pending counts. Analytics Refresh reloads only the selected Work Activity range. Historical sprint spillover charts are omitted because the API has no efficient bounded aggregate. A future GET /api/analytics/sprint-health?limit=6 should return per-sprint spillover/blocker/demo/delivery metrics and sprint dates without raw historical JIRAs.

## Releases and restoration

Releases use independent responsive cards, visible status, optional component/type/version/date and a labeled disclosure only when extra detail exists. Jira keys remain internal links with separate external actions. Pending has a full accessible label, and segments scroll instead of clipping. The selected release tab and loaded records survive navigation to a JIRA and back. Release items are not grouped by JIRA because a cursor boundary can split a group; each release remains self-contained.

## Verification

Angular application/template compilation and spec TypeScript compilation pass. Android script tests cover idempotence, plugin registration, export FileProvider and absence of broad storage permissions. Added client tests cover cursor append/reset/cache, bounded calendar loading, export selection/deduplication/empty states, safe report HTML, platform output, sparse release cards, icon labels and real analytics aggregation.

The configured Angular test runner and build cannot start in this Windows process with WSL-installed @esbuild/linux-x64. Capacitor sync cannot proceed until the build creates www. Browser print preview, generated Web PDF and native Android share output still need end-to-end verification in WSL/browser/device. No Worker or authentication architecture changes were made.
