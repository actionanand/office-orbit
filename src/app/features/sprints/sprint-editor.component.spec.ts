import { addCalendarDays } from './sprint-editor.component';

describe('Sprint date defaults', () => {
  it.each([
    ['2026-10-25', '2026-11-07'],
    ['2026-12-25', '2027-01-07'],
    ['2028-02-20', '2028-03-04'],
  ])('adds 13 calendar days to %s without local-time drift', (start, expected) => {
    expect(addCalendarDays(start, 13)).toBe(expected);
  });

  it('rejects values outside YYYY-MM-DD', () => {
    expect(addCalendarDays('10/14/2026', 13)).toBe('');
  });
});
