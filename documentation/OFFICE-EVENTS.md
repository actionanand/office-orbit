# Office Events

Open **Office Events** from the sidebar or mobile **More** page (`/app/office-events`). It is a compact chronological view; use Office Pulse for full source details.

- **This Sprint:** includes events within the inclusive start/end dates of `DashboardService`'s Worker `/api/dashboard` `currentSprint`. No active Sprint, missing dates, and request failures have separate states; month views remain available.
- **This Month:** first through last day of the current local calendar month.
- **Next Month:** the following calendar month, including December → January.

## Sources and configuration

The implementation was checked against the local Office Pulse repository at `/mnt/c/AR_Files/code/office-pulse` (Windows: `C:\AR_Files\code\office-pulse`), including its environment files, services, models, and holiday/rota components. That repository is reference-only.

Both Office Orbit environment files contain the same public-sheet identifiers copied from Office Pulse:

| Property             | Value                                          |
| -------------------- | ---------------------------------------------- |
| `GOOGLE_SHEET_ID`    | `1YxH6WgNo9F8ZN4aaWRQVhfodup-pcuxX346rY9IjuGs` |
| `HOLIDAY_SHEET_GID`  | `1338469281`                                   |
| `IMP_DAYS_SHEET_GID` | `1294772822`                                   |
| `ROTA_SHEET_GID`     | `381539897`                                    |

All three sources use browser GET requests directly to `https://docs.google.com/spreadsheets/d/{GOOGLE_SHEET_ID}/gviz/tq` with `tqx=out:json`, `gid`, and `headers=1`. Rota uses **GViz, not CSV**. There is no Worker proxy, Google API key, or manually attached authorization. The existing auth interceptor only sends the Bearer token to protected routes on the Worker origin.

`parseGviz()` checks the callback wrapper and uses `JSON.parse`; it never executes the response. Null cells are retained. Raw `Date(year, zeroBasedMonth, day)` takes precedence over formatted dates. ISO calendar dates and English `14 Sep 2026` / `Sep 14, 2026` forms are supported as fallbacks. Ambiguous numeric dates and invalid calendar dates are rejected. Filtering uses canonical local `YYYY-MM-DD` dates, without UTC conversion.

| Source         | Columns A through last column                                            |
| -------------- | ------------------------------------------------------------------------ |
| Holidays       | S No, Holiday Name, Date, Day, Meta                                      |
| Important Days | S No, Important Day, Date, optional Day, optional Tamil Day, Meta        |
| Rota           | S No, Month, Date, Date Range, Category, Others Involved, Comments, Meta |

Every event needs a positive integer serial number. Holiday rows additionally need name/date/day; Important Days need name/date. Rota requires a usable date, supported date range, or valid month. Headers, metadata-only rows, invalid identities, and rows without required fields are skipped. Metadata is never displayed. Rota text, including commas, quotes, and embedded line breaks, comes directly from GViz cells. Numeric months 1–12 and English month names are recognized.

## Rota windows and ordering

Supported range syntax is deliberately narrow: `Jan 19 - Feb 10`, with optional explicit four-digit years (`Dec 28 2026 - Jan 5 2027`) and hyphen or en dash. Month names can be abbreviated or full. Reversed days within the same month are rejected rather than guessing a year-long range.

Yearless ranges are resolved against the selected window's years and the preceding year, allowing `Dec 28 - Jan 5` to overlap January. An ending month earlier than the starting month crosses into the next year. Explicit years stay fixed. Duplicate candidates are removed. A range overlaps when `rangeStart <= windowEnd && rangeEnd >= windowStart`; it need not fit entirely inside the Sprint/month.

When a range is invalid, a valid exact date is used, then a valid month; otherwise the row is excluded. Month-only Rota spans the whole matching calendar month, so any Sprint overlap includes it. Month-only dates do not imply a specific year in the source; the target period supplies it. Sort order is effective start date, then Holiday / Important Day / Rota, then original row order. Month-only Rota sorts at month start.

## Loading and privacy

Successful sheet responses are cached in a small in-memory map for five minutes. There is no localStorage, sessionStorage, IndexedDB, or DataCacheService storage for sheet data. Refresh clears the map, re-fetches all three sheets, and asks DashboardService to bypass its cache. A late response from an earlier cache generation cannot repopulate the cleared map.

Requests time out after 15 seconds. A failed sheet produces a compact warning while successful sources remain visible. Failed responses are not cached. Sheet contents are not logged. The page uses Ionic segments/buttons and existing theme variables, with wrapping text and a single-column layout on narrow screens.

## Markdown file limit

Both environment files set `markdownFileMaxBytes: 4_500_000`. Reference Library Import and local Preview share this client validation value, accepting files exactly at the limit and rejecting larger files. The error displays the configured byte limit.

Example configurations:

```ts
// 150 bytes
markdownFileMaxBytes: 150;
// 200 KB
markdownFileMaxBytes: 200 * 1024;
// 1 MB
markdownFileMaxBytes: 1 * 1024 * 1024;
// 10 MB
markdownFileMaxBytes: 10 * 1024 * 1024;
// 1 GB
markdownFileMaxBytes: 1 * 1024 * 1024 * 1024;
```

This changes client validation only. The Worker enforces its own separate import maximum and may reject an import even if a larger client limit permits it. Local Preview remains local-only and does not upload files.
