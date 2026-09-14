import { cellDate, GvizRow, parseGviz } from './gviz';
import { eventsInWindow, monthWindow, parseEvents, rotaRange, sprintWindow } from './office-event';

const row = (...values: (string | number | null)[]): GvizRow => values.map(v => (v === null ? null : { v }));

describe('Office Events GViz parsing', () => {
  it('safely unwraps JSONP, preserving null cells and raw/formatted dates', () => {
    const rows = parseGviz(
      '/*O_o*/\ngoogle.visualization.Query.setResponse(' +
        JSON.stringify({
          status: 'ok',
          table: { rows: [{ c: [null, { v: 'Date(2026,8,14)', f: '14 Sep 2026' }] }] },
        }) +
        ');',
    );
    expect(rows[0][0]).toBeNull();
    expect(cellDate(rows[0][1])).toBe('2026-09-14');
    expect(cellDate({ v: 'Date(2026,0,1)', f: '2 Jan 2026' })).toBe('2026-01-01');
    expect(cellDate({ v: null, f: 'Sep 14, 2026' })).toBe('2026-09-14');
    expect(cellDate({ v: '2026-02-30' })).toBeNull();
    expect(cellDate({ v: '09/10/2026' })).toBeNull();
  });
  it.each([
    'alert(1)',
    'google.visualization.Query.setResponse({});',
    'google.visualization.Query.setResponse({"status":"error"});',
  ])('rejects invalid responses: %s', input => {
    expect(() => parseGviz(input)).toThrow();
  });
  it('maps Holidays and skips headers, metadata, and malformed rows', () => {
    const events = parseEvents(
      [
        row('S No', 'Holiday', 'Date', 'Day'),
        row(1, 'Onam', 'Date(2026,8,14)', 'Monday', 'Title'),
        row(null, null, null, null, 'Notes'),
        row(2, 'Bad', '2026-02-30', 'Monday'),
        row(3, 'No day', '2026-09-14'),
      ],
      'holiday',
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ sNo: 1, title: 'Onam', startDate: '2026-09-14', day: 'Monday' });
  });
  it('maps optional Important Day fields and ignores metadata-only rows', () => {
    const events = parseEvents(
      [
        row(1, 'Day', '2026-09-14', null, null),
        row(2, 'Day two', '2026-09-15', 'Tuesday', 'Tamil day'),
        row(null, null, null, null, null, 'Year'),
      ],
      'important-day',
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toMatchObject({ day: '', tamilDay: '' });
    expect(events[1]).toMatchObject({ day: 'Tuesday', tamilDay: 'Tamil day' });
  });
  it('maps Rota exact dates, ranges and months, retaining quoted text', () => {
    const events = parseEvents(
      [
        row(1, 9, '2026-09-14', '', 'Support', 'A, "B"', 'First\nSecond'),
        row(2, null, null, 'Jan 19 - Feb 10', 'Rota'),
        row(3, 10),
        row(4, 13, null, 'unknown'),
        row(null, null, null, null, null, null, null, 'Meta'),
      ],
      'rota',
    );
    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({ startDate: '2026-09-14', othersInvolved: 'A, "B"', comments: 'First\nSecond' });
    expect(events[1].dateRange).toBe('Jan 19 - Feb 10');
    expect(events[2].month).toBe(10);
  });
});

describe('Office Events date windows', () => {
  it('filters month windows, including December to January', () => {
    const events = parseEvents(
      [
        row(1, 'December', '2026-12-31', 'Thursday'),
        row(2, 'January', '2027-01-01', 'Friday'),
        row(3, 'Later', '2027-02-01', 'Monday'),
      ],
      'holiday',
    );
    expect(eventsInWindow(events, monthWindow(2026, 12)).map(e => e.title)).toEqual(['December']);
    expect(monthWindow(2026, 13)).toEqual({ startDate: '2027-01-01', endDate: '2027-01-31' });
    expect(eventsInWindow(events, monthWindow(2026, 13)).map(e => e.title)).toEqual(['January']);
  });
  it('includes Sprint boundaries and overlapping ranges/months, but excludes unrelated dates', () => {
    const events = [
      ...parseEvents(
        [
          row(1, 'Start', '2026-01-20', 'Tuesday'),
          row(2, 'End', '2026-02-02', 'Monday'),
          row(3, 'Outside', '2026-02-03', 'Tuesday'),
        ],
        'holiday',
      ),
      ...parseEvents(
        [row(1, null, null, 'Jan 19 - Feb 10'), row(2, null, null, 'Mar 1 - Mar 5'), row(3, 2), row(4, 3)],
        'rota',
      ),
    ];
    const results = eventsInWindow(events, { startDate: '2026-01-20', endDate: '2026-02-02' });
    expect(results.map(e => e.title)).toEqual(['Rota duty', 'Start', 'Rota duty', 'End']);
    expect(results.filter(e => e.type === 'rota').map(e => e.sNo)).toEqual([1, 3]);
  });
  it('infers yearless crossing ranges relative to the target period without duplication', () => {
    const events = parseEvents([row(1, null, null, 'Dec 28 - Jan 5')], 'rota');
    expect(eventsInWindow(events, monthWindow(2027, 1))[0]).toMatchObject({
      startDate: '2026-12-28',
      endDate: '2027-01-05',
    });
    expect(eventsInWindow(events, { startDate: '2026-12-30', endDate: '2027-01-02' })).toHaveLength(1);
    expect(eventsInWindow(events, monthWindow(2027, 2))).toEqual([]);
  });
  it('honors explicit years and safely falls back to month for invalid ranges', () => {
    const events = parseEvents(
      [row(1, 1, null, 'Jan 19 2026 - Feb 10 2026'), row(2, 1, null, 'Jan 32 - Feb 10')],
      'rota',
    );
    expect(eventsInWindow(events, monthWindow(2027, 1)).map(e => e.sNo)).toEqual([2]);
    expect(rotaRange('Jan 20 - Jan 10', 2026)).toBeNull();
  });
  it('sorts equal dates by source then original row order', () => {
    const events = [
      ...parseEvents([row(1, null, '2026-09-14')], 'rota'),
      ...parseEvents([row(1, 'Important', '2026-09-14')], 'important-day'),
      ...parseEvents(
        [row(2, 'First holiday', '2026-09-14', 'Monday'), row(1, 'Second holiday', '2026-09-14', 'Monday')],
        'holiday',
      ),
    ];
    expect(eventsInWindow(events, monthWindow(2026, 9)).map(e => e.title)).toEqual([
      'First holiday',
      'Second holiday',
      'Important',
      'Rota duty',
    ]);
  });
  it('rejects absent, incomplete and reversed Sprint dates', () => {
    expect(sprintWindow(null)).toBeNull();
    expect(sprintWindow({ startDate: null, endDate: '2026-09-14' })).toBeNull();
    expect(sprintWindow({ startDate: '2026-09-15', endDate: '2026-09-14' })).toBeNull();
    expect(sprintWindow({ startDate: '2026-09-14', endDate: '2026-09-14' })).not.toBeNull();
  });
});
