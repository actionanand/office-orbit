import { Todo, TodoQueryFilters, Weekday } from '../../shared/models/api.models';
import { todayIso } from '../../shared/utils/editor';
import { parseDate } from '../office-events/gviz';

export const WEEKDAYS: Weekday[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
export const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];
export const MONTH_DAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
export const SPECIAL_LOOKAHEAD_DAYS = 31;
export type Recurrence = Pick<
  Todo,
  | 'schedule'
  | 'repeatOn'
  | 'interval'
  | 'repeatStart'
  | 'repeatDay'
  | 'repeatMonth'
  | 'monthEnd'
  | 'recurring'
  | 'workdayAdjust'
  | 'setupIssue'
>;
export interface AdjustedReminder {
  scheduledDate: string;
  reminderDate: string;
  reason: string;
}
export interface SpecialTodo {
  todo: Todo;
  reminders: AdjustedReminder[];
}

export function localDate(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !parseDate(value)) throw new Error('Invalid calendar date.');
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}
export function addDays(date: string, days: number): string {
  const value = localDate(date);
  value.setDate(value.getDate() + days);
  return todayIso(value);
}
function ordinal(date: string): number {
  const value = localDate(date);
  // UTC is used only for ordinal arithmetic on already parsed local calendar parts (DST-safe).
  return Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) / 86400000;
}
export function occursOn(todo: Recurrence, date: string): boolean {
  if (!todo.recurring || todo.setupIssue) return false;
  const value = localDate(date),
    day = value.getDate(),
    month = value.getMonth();
  if (todo.schedule === 'Daily' || todo.schedule === 'Weekly') {
    const interval = todo.interval ?? 1;
    if (!Number.isInteger(interval) || interval < 1) return false;
    if (interval > 1) {
      if (!todo.repeatStart || !/^\d{4}-\d{2}-\d{2}$/.test(todo.repeatStart) || !parseDate(todo.repeatStart))
        return false;
      const delta = ordinal(date) - ordinal(todo.repeatStart);
      if (delta < 0 || (todo.schedule === 'Daily' ? delta : Math.floor(delta / 7)) % interval !== 0) return false;
    }
    return todo.schedule === 'Daily' || todo.repeatOn.includes(WEEKDAYS[(value.getDay() + 6) % 7]);
  }
  if (todo.schedule === 'Monthly') {
    if (todo.monthEnd === 'Last day') return day === MONTH_DAYS[month];
    if (todo.monthEnd === 'Day before last day') return day === MONTH_DAYS[month] - 1;
    return !todo.monthEnd && day === todo.repeatDay;
  }
  return (
    todo.schedule === 'Yearly' &&
    MONTHS[month] === todo.repeatMonth &&
    day === todo.repeatDay &&
    day <= MONTH_DAYS[month]
  );
}
export function occurrencesInRange(todo: Recurrence, start: string, end: string): string[] {
  const result: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) if (occursOn(todo, date)) result.push(date);
  return result;
}
export function isConfiguredWeekOff(date: string, weekOffDays: Weekday[]): boolean {
  return weekOffDays.includes(WEEKDAYS[(localDate(date).getDay() + 6) % 7]);
}
export function isNonWorkingDay(date: string, weekOffDays: Weekday[], holidays: ReadonlySet<string>): boolean {
  return holidays.has(date) || isConfiguredWeekOff(date, weekOffDays);
}
export function previousWorkingDay(date: string, weekOffDays: Weekday[], holidays: ReadonlySet<string>): string {
  if (WEEKDAYS.every(day => weekOffDays.includes(day))) throw new Error('At least one working weekday is required.');
  let previous = addDays(date, -1);
  // Finite holiday set + at least one working weekday guarantees a working day within this bound.
  const limit = (holidays.size + 1) * 7;
  for (let count = 0; count <= limit; count++, previous = addDays(previous, -1)) {
    if (!isNonWorkingDay(previous, weekOffDays, holidays)) return previous;
  }
  throw new Error('A previous working day could not be determined.');
}
export function adjustOccurrence(
  todo: Recurrence,
  date: string,
  weekOffDays: Weekday[],
  holidays: ReadonlySet<string>,
): AdjustedReminder | null {
  if (!todo.recurring || !todo.workdayAdjust || !occursOn(todo, date) || !isNonWorkingDay(date, weekOffDays, holidays))
    return null;
  const reminderDate = previousWorkingDay(date, weekOffDays, holidays);
  let holiday = false,
    weekOff = false;
  for (let skipped = date; skipped > reminderDate; skipped = addDays(skipped, -1)) {
    holiday ||= holidays.has(skipped);
    weekOff ||= isConfiguredWeekOff(skipped, weekOffDays);
  }
  return {
    scheduledDate: date,
    reminderDate,
    reason: holiday && weekOff ? 'Holiday + week off' : holiday ? 'Holiday' : 'Week off',
  };
}
export function specialRemindersForDate(
  todos: Todo[],
  today: string,
  weekOffDays: Weekday[],
  holidays: ReadonlySet<string>,
): SpecialTodo[] {
  return todos.flatMap(todo => {
    if (!todo.workdayAdjust || !todo.recurring) return [];
    const reminders = occurrencesInRange(todo, addDays(today, 1), addDays(today, SPECIAL_LOOKAHEAD_DAYS))
      .map(date => adjustOccurrence(todo, date, weekOffDays, holidays))
      .filter((reminder): reminder is AdjustedReminder => reminder?.reminderDate === today);
    return reminders.length ? [{ todo, reminders }] : [];
  });
}
export function mergeToday(base: Todo[], special: SpecialTodo[]): Todo[] {
  const rows = new Map(special.map(item => [item.todo.id, item.todo]));
  for (const todo of base) rows.set(todo.id, todo);
  return [...rows.values()].sort((a, b) => Number(a.status === 'Done') - Number(b.status === 'Done'));
}
export function recurrenceSummary(todo: Recurrence): string {
  if (!todo.schedule) return '';
  if (todo.schedule === 'Daily') return (todo.interval ?? 1) > 1 ? `Every ${todo.interval} days` : 'Daily';
  if (todo.schedule === 'Weekly')
    return `${(todo.interval ?? 1) > 1 ? `Every ${todo.interval} weeks` : 'Weekly'} · ${todo.repeatOn.map(day => day.slice(0, 3)).join(', ')}`;
  if (todo.schedule === 'Monthly') return `Monthly · ${todo.monthEnd || `Day ${todo.repeatDay ?? '?'}`}`;
  if (todo.schedule === 'Yearly') return `Yearly · ${todo.repeatMonth?.slice(0, 3) ?? '?'} ${todo.repeatDay ?? '?'}`;
  return todo.schedule;
}
export function todoViewFilters(view: string, today: string, q = ''): TodoQueryFilters | null {
  const open = ['Not started', 'In progress'];
  const filters: TodoQueryFilters =
    view === 'open'
      ? { statuses: open }
      : view === 'today'
        ? { showToday: true }
        : view === 'upcoming'
          ? { statuses: open, dueFrom: addDays(today, 1), recurring: false }
          : view === 'special'
            ? { recurring: true, workdayAdjust: true }
            : view === 'recurring'
              ? { recurring: true }
              : view === 'overdue'
                ? { statuses: open, dueBefore: today, recurring: false }
                : view === 'done'
                  ? { statuses: ['Done'] }
                  : view === 'attention'
                    ? { hasSetupIssue: true }
                    : {};
  if (q.trim()) filters.q = q.trim();
  return Object.keys(filters).length ? filters : null;
}
