import { formatDate, formatDateTime, formatRelativeTime } from './format';

describe('date formatting', () => {
  it('presents API dates without raw ISO values', () => {
    expect(formatDate('2026-09-02T10:32:00.000Z')).toBe('Sep 2, 2026');
    expect(formatDateTime('2026-09-02T10:32:00.000Z')).not.toContain('T10:32');
  });

  it('presents recent refresh times relatively', () => {
    const now = new Date('2026-09-02T10:36:00.000Z').getTime();
    expect(formatRelativeTime('2026-09-02T10:32:00.000Z', now)).toBe('Updated 4 min ago');
  });
});
