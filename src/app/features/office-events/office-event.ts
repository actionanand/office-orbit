import { GvizRow, calendarDate, cellDate, cellText, monthNumber, parseDate } from './gviz';

export type OfficeEventType = 'holiday' | 'important-day' | 'rota';
export interface OfficeEvent {
  id: string;
  type: OfficeEventType;
  title: string;
  sNo: number;
  startDate: string | null;
  endDate: string | null;
  day?: string;
  tamilDay?: string;
  category?: string;
  othersInvolved?: string;
  comments?: string;
  month?: number;
  dateRange?: string;
  sourceOrder: number;
}
export interface EventWindow {
  startDate: string;
  endDate: string;
}
export type Period = 'sprint' | 'month' | 'next-month';
export const EVENT_LABELS: Record<OfficeEventType, string> = {
  holiday: 'Holiday',
  'important-day': 'Important Day',
  rota: 'Rota',
};

export function monthWindow(year: number, month: number): EventWindow {
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    startDate: calendarDate(start.getFullYear(), start.getMonth() + 1, 1)!,
    endDate: calendarDate(end.getFullYear(), end.getMonth() + 1, end.getDate())!,
  };
}

/** Only Month D[ YYYY] - Month D[ YYYY], as documented in Office Pulse. */
export function rotaRange(value: string, anchorYear: number): EventWindow | null {
  const match = /^([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?\s+[-–]\s+([a-z]+)\s+(\d{1,2})(?:,?\s+(\d{4}))?$/i.exec(
    value.trim(),
  );
  if (!match) return null;
  const fromMonth = monthNumber(match[1]);
  const toMonth = monthNumber(match[4]);
  if (!fromMonth || !toMonth) return null;
  const crossesYear = toMonth < fromMonth;
  const fromYear = match[3] ? +match[3] : match[6] ? +match[6] - Number(crossesYear) : anchorYear;
  const toYear = match[6] ? +match[6] : fromYear + Number(crossesYear);
  const startDate = calendarDate(fromYear, fromMonth, +match[2]);
  const endDate = calendarDate(toYear, toMonth, +match[5]);
  return startDate && endDate && startDate <= endDate ? { startDate, endDate } : null;
}

export function parseEvents(rows: GvizRow[], type: OfficeEventType): OfficeEvent[] {
  return rows.flatMap<OfficeEvent>((cells, sourceOrder) => {
    const serial = cellText(cells[0]);
    if (!/^\d+$/.test(serial) || Number(serial) <= 0) return [];
    const sNo = Number(serial);
    const date = cellDate(cells[2]);
    const base = { id: `${type}:${sNo}:${sourceOrder}`, type, sNo, sourceOrder, startDate: date, endDate: date };
    if (type !== 'rota') {
      const title = cellText(cells[1]);
      const day = cellText(cells[3]);
      if (!title || !date || (type === 'holiday' && !day)) return [];
      return [{ ...base, title, day, ...(type === 'important-day' ? { tamilDay: cellText(cells[4]) } : {}) }];
    }
    const month = monthNumber(cellText(cells[1]));
    const dateRange = cellText(cells[3]);
    if (!date && !month && !rotaRange(dateRange, 2000)) return [];
    const category = cellText(cells[4]);
    return [
      {
        ...base,
        title: category || 'Rota duty',
        category,
        ...(month ? { month } : {}),
        dateRange,
        othersInvolved: cellText(cells[5]),
        comments: cellText(cells[6]),
      },
    ];
  });
}

export function overlaps(a: EventWindow, b: EventWindow): boolean {
  return a.startDate <= b.endDate && a.endDate >= b.startDate;
}

export function eventsInWindow(events: OfficeEvent[], window: EventWindow): OfficeEvent[] {
  const result: OfficeEvent[] = [];
  for (const event of events) {
    const candidates: EventWindow[] = [];
    if (event.type === 'rota' && event.dateRange) {
      for (let year = +window.startDate.slice(0, 4) - 1; year <= +window.endDate.slice(0, 4); year++) {
        const range = rotaRange(event.dateRange, year);
        if (range) candidates.push(range);
      }
    }
    if (!candidates.length && event.startDate && event.endDate)
      candidates.push({ startDate: event.startDate, endDate: event.endDate });
    if (!candidates.length && event.month) {
      for (let year = +window.startDate.slice(0, 4); year <= +window.endDate.slice(0, 4); year++)
        candidates.push(monthWindow(year, event.month));
    }
    const seen = new Set<string>();
    for (const range of candidates) {
      if (!overlaps(range, window) || seen.has(range.startDate)) continue;
      seen.add(range.startDate);
      result.push({ ...event, ...range, id: `${event.id}:${range.startDate}` });
    }
  }
  const rank = { holiday: 0, 'important-day': 1, rota: 2 };
  return result.sort(
    (a, b) =>
      a.startDate!.localeCompare(b.startDate!) ||
      rank[a.type] - rank[b.type] ||
      a.sourceOrder - b.sourceOrder ||
      a.id.localeCompare(b.id),
  );
}

export function sprintWindow(sprint: { startDate: string | null; endDate: string | null } | null): EventWindow | null {
  const startDate = parseDate(sprint?.startDate ?? '');
  const endDate = parseDate(sprint?.endDate ?? '');
  return startDate && endDate && startDate <= endDate ? { startDate, endDate } : null;
}
