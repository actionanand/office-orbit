import { localDate } from '../work-logs/calendar';

export type AnalyticsRangePreset = '30' | '90' | '6m' | '1y' | 'custom';
export interface AnalyticsDateRange {
  from: string;
  to: string;
}

function fromDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value)) return null;
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function calendarDayTimestamp(date: Date): number {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
}

export function analyticsRange(
  preset: Exclude<AnalyticsRangePreset, 'custom'>,
  today = new Date(),
): AnalyticsDateRange {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  if (preset === '6m') {
    const targetMonth = end.getMonth() - 6;
    const targetYear = end.getFullYear() + Math.floor(targetMonth / 12);
    const normalizedMonth = ((targetMonth % 12) + 12) % 12;
    start.setDate(1);
    start.setFullYear(targetYear, normalizedMonth);
    start.setDate(Math.min(end.getDate(), new Date(targetYear, normalizedMonth + 1, 0).getDate()));
  } else {
    start.setDate(end.getDate() - (preset === '30' ? 29 : preset === '90' ? 89 : 364));
  }
  return { from: localDate(start), to: localDate(end) };
}

export function validateAnalyticsRange(from: string, to: string): string {
  const start = fromDateOnly(from);
  const end = fromDateOnly(to);
  if (!start || !end) return 'Choose valid From and To dates.';
  if (start > end) return 'From date must be on or before To date.';
  const inclusiveDays = (calendarDayTimestamp(end) - calendarDayTimestamp(start)) / 86_400_000 + 1;
  return inclusiveDays > 370 ? 'Choose a range of 370 days or less.' : '';
}
