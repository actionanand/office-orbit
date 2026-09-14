# To Do recurrence and early reminders

To Do supports Daily, Weekly, Monthly and Yearly schedules using the existing Worker `/api/todos` create/patch/delete/query endpoints. Tasks, Memos, Markdown and Reference Library retain their existing flows. Dropdowns, multi-selects, checkboxes, date pickers and icons use the app's Ionic components and Ionicons.

## Editor

Schedule **None** shows Due Date and hides recurrence settings. Selecting a schedule immediately clears and hides Due Date. The editor loads live `/api/todos/meta` option IDs and maps response names back to those IDs when editing.

- Daily: optional integer Interval; Repeat Start appears and is required only above 1.
- Weekly: required multiple Repeat On weekdays, optional Interval and conditional Repeat Start.
- Monthly: one local-only timing selector chooses Specific day (1–31) or Month end. Switching mode clears the other field. Month End options are Last day / Day before last day.
- Yearly: Repeat Month plus Repeat Day. February accepts 1–28; April, June, September and November accept 1–30.

Workday Adjust is an opt-in checkbox for recurring tasks. Incompatible fields clear as the schedule changes. Empty option/date/number fields are sent as `null`, Repeat On as an array, and Workday Adjust as a boolean. There is no Custom schedule, Repeat Unit or persisted monthly timing mode. `recurring`, `showToday` and `setupIssue` are read-only and are never written. Setup issues are shown in the editor and list.

## Views and exact filters

| View            | Worker QUERY filters                                                  |
| --------------- | --------------------------------------------------------------------- |
| All             | None (search alone uses `q`)                                          |
| Open            | `statuses: ["Not started", "In progress"]`                            |
| Today           | `showToday: true` — **no status filter**                              |
| Upcoming        | Open statuses, `dueFrom: tomorrow`, `recurring: false`                |
| Special         | Candidates: `recurring: true, workdayAdjust: true`; local calculation |
| Recurring       | `recurring: true` — no status filter                                  |
| Overdue         | Open statuses, `dueBefore: today`, `recurring: false`                 |
| Done            | `statuses: ["Done"]`                                                  |
| Needs Attention | `hasSetupIssue: true`                                                 |

Debounced search adds `q` to server-backed views. Special applies search locally to title, notes and recurrence summary. Today merges matching Special reminders into Worker results and deduplicates by Todo ID. Worker rows win if both sources return the same Todo, while adjusted occurrence metadata is retained. Done items remain visible in Today when returned by the Worker and sort after unfinished items. Their titles remain struck through.

Normal views retain existing cursor/Load more behavior. Today and Special use an independent all-pages helper: page size 100, opaque cursors until `hasMore=false`, ID deduplication, repeated/missing cursor detection, and a defensive limit of 100 pages. Reaching the limit produces an error/warning, never a silent partial result. It does not change QueryCursorService state. Its memory-cache keys begin with `/api/todos`, so existing mutation invalidation clears them. Refresh bypasses query, work-calendar and holiday caches. Successful CRUD/status changes reload the current view and recompute reminders.

## Recurrence semantics

Calculations use local calendar dates, never UTC-parsed `new Date("YYYY-MM-DD")` values. Calendar-day differences use ordinal arithmetic on date parts to avoid DST errors.

- Daily Interval > 1: `daysSinceRepeatStart >= 0` and divisible by Interval.
- Weekly: selected weekday must match. Interval > 1 additionally requires `floor(daysSinceRepeatStart / 7) % Interval === 0`, anchored to Repeat Start rather than calendar-week boundaries.
- Monthly specific day: occurs only if that day exists; day 31 does not roll into another month.
- Monthly Month End deliberately follows the Worker/Notion fixed February rule: **February 28**, including leap years. Day before last is February 27. Other months use their usual 30/31-day endings.
- Yearly: exact month/day; February never exceeds 28.

Invalid/setup-issue recurrences do not produce predicted reminders. Worker validation and `showToday` remain authoritative.

## Work calendar and holiday reuse

The To Do header's calendar button opens an Ionic dialog. Authenticated `GET /api/settings/work-calendar` supplies the user's actual week-off settings; `PATCH` saves `{ weekOffDays }`. Empty selection is valid. All seven days are rejected. The UI does not assume Saturday/Sunday: the Worker supplies its configured/default values, and values are ordered Monday–Sunday.

`OfficeEventsService.holidayDates()` reuses the existing GvizService, parser and five-minute memory cache. It reads only the Holiday sheet using the existing configuration. Important Days and Rota are **not** holidays. There is no second Sheets integration, Worker holiday proxy, Google credential or persistent sheet storage.

## Special: an early reminder, not a moved recurrence

For each valid recurrence with Workday Adjust enabled, scan scheduled occurrences from tomorrow through **31 days ahead**, inclusive. This is a bounded near-term prediction, not a historical calendar. Long non-working periods extending beyond that horizon are not predicted.

If the occurrence is a holiday or configured week off, walk backward one local calendar day at a time until a day is neither. Reasons include every skipped day: Holiday, Week off, or Holiday + week off. A finite holiday set and at least one working weekday guarantee termination; an invalid seven-day week-off configuration is rejected.

Only reminders adjusted to **today** appear in Special and are merged into Today. Multiple shifted occurrences for one Todo share a single row, with Scheduled / Reminder / Reason details for each occurrence. Example: Monday Aug 31 holiday plus Saturday/Sunday off produces Friday Aug 28's reminder.

**The actual recurrence is never mutated.** Prediction does not PATCH Todos, change Due Date/Repeat On/Repeat Day/Month End, modify Notion formulas or suppress the real occurrence. It may still appear on its original date when Worker `showToday=true`.

## Failure behavior

- Holiday failure: a compact warning explains that holiday-based adjustment is incomplete; configured week-off adjustments can still run.
- Work-calendar failure: no guessed week-off configuration is used; early reminders are unavailable with a warning. Worker Today results still render.
- Candidate query failure/cap: warns that early reminders could not load; Worker Today results still render.
- Worker Today failure: the existing error/retry panel is shown.
- Settings save failures use the existing snackbar. Retry/Refresh reloads the relevant sources.

Recurrence calculation and query services never log task or sheet contents and introduce no package, Worker change or deployment.
