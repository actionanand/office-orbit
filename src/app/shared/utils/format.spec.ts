import { formatDate, formatDateRange, formatDateTime, formatRelativeTime, formatTodayLabel } from './format';

describe('date formatting', () => {
  it('presents API dates without raw ISO values', () => {
    expect(formatDate('2026-09-02T10:32:00.000Z')).toBe('Sep 2, 2026');
    expect(formatDateTime('2026-09-02T10:32:00.000Z')).not.toContain('T10:32');
  });

  it('presents recent refresh times relatively', () => {
    const now = new Date('2026-09-02T10:36:00.000Z').getTime();
    expect(formatRelativeTime('2026-09-02T10:32:00.000Z', now)).toBe('Updated 4 min ago');
  });

  it('formats today with its year', () => {
    expect(formatTodayLabel(new Date(2027, 8, 12))).toBe('Sep 12, 2027');
  });

  it('formats Sprint ranges and safely omits invalid or absent dates', () => {
    expect(formatDateRange('2026-08-19', '2026-09-01')).toBe('Aug 19 – Sep 1, 2026');
    expect(formatDateRange(null, '2026-09-01')).toBe('Sep 1, 2026');
    expect(formatDateRange('invalid', null)).toBe('');
  });
});
