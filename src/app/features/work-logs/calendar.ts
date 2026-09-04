export interface CalendarDay {
  date: string | null;
  day: number | null;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function monthRange(month: string): { from: string; to: string } {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error('Month must use YYYY-MM format.');
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return { from: `${year}-${pad(monthIndex + 1)}-01`, to: `${year}-${pad(monthIndex + 1)}-${pad(lastDay)}` };
}

export function calendarDays(month: string): CalendarDay[] {
  const { from, to } = monthRange(month);
  const [year, monthNumber] = from.split('-').map(Number);
  const total = Number(to.slice(-2));
  const leading = new Date(year, monthNumber - 1, 1).getDay();
  const days: CalendarDay[] = Array.from({ length: leading }, () => ({ date: null, day: null }));
  for (let day = 1; day <= total; day += 1) days.push({ date: `${year}-${pad(monthNumber)}-${pad(day)}`, day });
  while (days.length % 7) days.push({ date: null, day: null });
  return days;
}

export function shiftMonth(month: string, offset: number): string {
  const { from } = monthRange(month);
  const date = new Date(`${from}T00:00:00`);
  date.setMonth(date.getMonth() + offset);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function currentMonth(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
}
