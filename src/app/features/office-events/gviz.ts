export interface GvizCell {
  v: string | number | boolean | null;
  f?: string;
}
export type GvizRow = (GvizCell | null)[];

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Parse data, never execute Google's JSONP callback. */
export function parseGviz(response: string): GvizRow[] {
  const wrapper = /^\s*(?:\/\*O_o\*\/\s*)?google\.visualization\.Query\.setResponse\(([\s\S]*)\);?\s*$/.exec(response);
  if (!wrapper) throw new Error('Invalid Google Sheets response.');
  const body: unknown = JSON.parse(wrapper[1]);
  if (!record(body) || body['status'] !== 'ok' || !record(body['table']) || !Array.isArray(body['table']['rows']))
    throw new Error('Google Sheets data is unavailable.');
  return body['table']['rows'].flatMap((row: unknown) => {
    if (!record(row) || !Array.isArray(row['c'])) return [];
    return [
      row['c'].map((cell: unknown): GvizCell | null => {
        if (cell === null) return null;
        if (!record(cell)) return null;
        const v = cell['v'];
        return {
          v: typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean' ? v : null,
          ...(typeof cell['f'] === 'string' ? { f: cell['f'] } : {}),
        };
      }),
    ];
  });
}

export function cellText(cell: GvizCell | null | undefined): string {
  return cell?.v == null ? (cell?.f?.trim() ?? '') : String(cell.v).trim();
}

export function calendarDate(year: number, month: number, day: number): string | null {
  const value = new Date(year, month - 1, day);
  if (
    year < 1000 ||
    year > 9999 ||
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day
  )
    return null;
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];
export function monthNumber(value: string): number | null {
  const numeric = /^\d{1,2}$/.test(value)
    ? Number(value)
    : MONTHS.findIndex(month => month === value.toLowerCase() || month.slice(0, 3) === value.toLowerCase()) + 1;
  return numeric >= 1 && numeric <= 12 ? numeric : null;
}

export function parseDate(value: string): string | null {
  const google = /^Date\((\d{4}),\s*(\d{1,2}),\s*(\d{1,2})(?:,\s*\d+){0,3}\)$/.exec(value);
  if (google) return calendarDate(+google[1], +google[2] + 1, +google[3]);
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (iso) return calendarDate(+iso[1], +iso[2], +iso[3]);
  const dayFirst = /^(\d{1,2})[ -]([a-z]+)[ ,\-]+(\d{4})$/i.exec(value);
  if (dayFirst) return calendarDate(+dayFirst[3], monthNumber(dayFirst[2]) ?? 0, +dayFirst[1]);
  const monthFirst = /^([a-z]+) (\d{1,2}),? (\d{4})$/i.exec(value);
  return monthFirst ? calendarDate(+monthFirst[3], monthNumber(monthFirst[1]) ?? 0, +monthFirst[2]) : null;
}

export function cellDate(cell: GvizCell | null | undefined): string | null {
  return parseDate(cellText(cell)) ?? parseDate(cell?.f?.trim() ?? '');
}
