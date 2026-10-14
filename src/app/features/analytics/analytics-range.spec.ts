import { analyticsRange, validateAnalyticsRange } from './analytics-range';

describe('analytics date ranges', () => {
  const today = new Date(2026, 2, 31);
  it('creates inclusive fixed ranges without timezone conversion', () => {
    expect(analyticsRange('30', today)).toEqual({ from: '2026-03-02', to: '2026-03-31' });
    expect(analyticsRange('90', today)).toEqual({ from: '2026-01-01', to: '2026-03-31' });
    expect(analyticsRange('1y', today)).toEqual({ from: '2025-04-01', to: '2026-03-31' });
  });
  it('uses calendar month semantics for six months', () => {
    expect(analyticsRange('6m', today)).toEqual({ from: '2025-09-30', to: '2026-03-31' });
  });
  it('rejects missing, inverted, malformed, and overlong custom ranges', () => {
    expect(validateAnalyticsRange('', '2026-03-31')).toBeTruthy();
    expect(validateAnalyticsRange('2026-04-01', '2026-03-31')).toBeTruthy();
    expect(validateAnalyticsRange('2026-02-31', '2026-03-31')).toBeTruthy();
    expect(validateAnalyticsRange('2025-03-26', '2026-03-31')).toBeTruthy();
    expect(validateAnalyticsRange('2025-03-08', '2026-03-13')).toBeTruthy();
    expect(validateAnalyticsRange('2025-03-27', '2026-03-31')).toBe('');
  });
});
