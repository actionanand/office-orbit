import { calendarDays, monthRange, shiftMonth } from './calendar';

describe('Work Log calendar', () => {
  it('generates exact month API filters', () => {
    expect(monthRange('2026-09')).toEqual({ from: '2026-09-01', to: '2026-09-30' });
    expect(monthRange('2028-02')).toEqual({ from: '2028-02-01', to: '2028-02-29' });
  });

  it('builds aligned calendar cells and navigates months', () => {
    const days = calendarDays('2026-09');
    expect(days.find(day => day.date === '2026-09-12')?.day).toBe(12);
    expect(days.length % 7).toBe(0);
    expect(shiftMonth('2026-12', 1)).toBe('2027-01');
  });
});
