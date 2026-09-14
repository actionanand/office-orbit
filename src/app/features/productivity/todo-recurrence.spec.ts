import { Todo, Weekday } from '../../shared/models/api.models';
import {
  adjustOccurrence,
  mergeToday,
  occursOn,
  specialRemindersForDate,
  todoViewFilters,
  previousWorkingDay,
  addDays,
} from './todo-recurrence';
import { todoFixture } from './todo.fixture';

const recurring = (overrides: Partial<Todo> = {}) =>
  todoFixture({ recurring: true, workdayAdjust: true, schedule: 'Daily', ...overrides });
describe('Todo recurrence calendar semantics', () => {
  it.each([
    [{}, '2026-09-14', true],
    [{ interval: 2, repeatStart: '2026-09-14' }, '2026-09-16', true],
    [{ interval: 2, repeatStart: '2026-09-14' }, '2026-09-15', false],
    [{ interval: 2, repeatStart: '2026-09-14' }, '2026-09-12', false],
  ] as [Partial<Todo>, string, boolean][])('Daily %j on %s => %s', (config, date, expected) => {
    expect(occursOn(recurring(config), date)).toBe(expected);
  });
  it.each([
    [{ repeatOn: ['Monday'] }, '2026-09-14', true],
    [{ repeatOn: ['Tuesday', 'Friday'] }, '2026-09-15', true],
    [{ repeatOn: ['Tuesday', 'Friday'] }, '2026-09-18', true],
    [{ repeatOn: ['Tuesday', 'Friday'] }, '2026-09-16', false],
    [{ repeatOn: ['Tuesday'], interval: 2, repeatStart: '2026-09-14' }, '2026-09-15', true],
    [{ repeatOn: ['Tuesday'], interval: 2, repeatStart: '2026-09-14' }, '2026-09-22', false],
    [{ repeatOn: ['Tuesday'], interval: 2, repeatStart: '2026-09-14' }, '2026-09-08', false],
    [{ repeatOn: ['Monday'], interval: 2, repeatStart: '2026-09-16' }, '2026-09-21', true],
    [{ repeatOn: ['Monday'], interval: 2, repeatStart: '2026-09-16' }, '2026-09-28', false],
  ] as [Partial<Todo>, string, boolean][])('Weekly anchor %j on %s => %s', (config, date, expected) => {
    expect(occursOn(recurring({ schedule: 'Weekly', ...config }), date)).toBe(expected);
  });
  it.each([
    [{ repeatDay: 15 }, '2026-09-15', true],
    [{ repeatDay: 31 }, '2026-01-31', true],
    [{ repeatDay: 31 }, '2026-04-30', false],
    [{ repeatDay: 31 }, '2026-05-01', false],
    [{ monthEnd: 'Last day' }, '2026-01-31', true],
    [{ monthEnd: 'Last day' }, '2026-04-30', true],
    [{ monthEnd: 'Last day' }, '2026-02-28', true],
    [{ monthEnd: 'Last day' }, '2028-02-28', true],
    [{ monthEnd: 'Last day' }, '2028-02-29', false],
    [{ monthEnd: 'Day before last day' }, '2026-01-30', true],
    [{ monthEnd: 'Day before last day' }, '2026-04-29', true],
    [{ monthEnd: 'Day before last day' }, '2028-02-27', true],
  ] as [Partial<Todo>, string, boolean][])('Monthly %j on %s => %s', (config, date, expected) => {
    expect(occursOn(recurring({ schedule: 'Monthly', ...config }), date)).toBe(expected);
  });
  it.each([
    ['December', 25, '2026-12-25', true],
    ['December', 25, '2026-11-25', false],
    ['December', 25, '2026-12-24', false],
    ['February', 28, '2028-02-28', true],
    ['February', 29, '2028-02-29', false],
  ] as [string, number, string, boolean][])('Yearly %s %s on %s => %s', (repeatMonth, repeatDay, date, expected) => {
    expect(occursOn(recurring({ schedule: 'Yearly', repeatMonth, repeatDay }), date)).toBe(expected);
  });
  it('uses calendar dates across month/year and DST boundaries', () => {
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(addDays('2026-03-08', 1)).toBe('2026-03-09');
  });
});

describe('Early reminders', () => {
  it.each([
    ['2026-09-15', [], [], null],
    ['2026-09-15', ['2026-09-15'], [], '2026-09-14'],
    ['2026-09-18', ['2026-09-18'], [], '2026-09-17'],
    ['2026-09-18', ['2026-09-18', '2026-09-17'], [], '2026-09-16'],
    ['2026-08-31', ['2026-08-31'], ['Saturday', 'Sunday'], '2026-08-28'],
    ['2026-05-31', [], ['Saturday', 'Sunday'], '2026-05-29'],
    ['2026-09-19', [], ['Friday', 'Saturday'], '2026-09-17'],
    ['2026-09-19', [], [], null],
  ] as [string, string[], Weekday[], string | null][])(
    '%s with holidays %j and week off %j',
    (date, holidays, weekOff, expected) => {
      const result = adjustOccurrence(recurring(), date, weekOff, new Set(holidays));
      expect(result?.reminderDate ?? null).toBe(expected);
    },
  );
  it('explains skipped days and never mutates the recurrence', () => {
    const todo = Object.freeze(recurring({ schedule: 'Monthly', monthEnd: 'Last day' }));
    expect(adjustOccurrence(todo, '2026-08-31', ['Saturday', 'Sunday'], new Set(['2026-08-31']))).toEqual({
      scheduledDate: '2026-08-31',
      reminderDate: '2026-08-28',
      reason: 'Holiday + week off',
    });
    expect(todo.monthEnd).toBe('Last day');
  });
  it('requires manual adjustment and valid recurrence setup', () => {
    expect(
      specialRemindersForDate(
        [recurring({ workdayAdjust: false }), recurring({ setupIssue: 'Missing repeat day' })],
        '2026-08-28',
        ['Saturday', 'Sunday'],
        new Set(),
      ),
    ).toEqual([]);
    expect(() =>
      previousWorkingDay(
        '2026-08-31',
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        new Set(),
      ),
    ).toThrow();
  });
  it('keeps multiple scheduled dates under one Todo and merges Today without duplicates, Done last', () => {
    const todo = recurring({ id: 'early', status: 'Done' });
    const special = specialRemindersForDate([todo], '2026-08-28', ['Saturday', 'Sunday'], new Set(['2026-08-31']));
    expect(special[0].reminders.map(r => r.scheduledDate)).toEqual(['2026-08-29', '2026-08-30', '2026-08-31']);
    const base = [
      todoFixture({ id: 'normal', dueDate: '2026-08-28', showToday: true }),
      todoFixture({ id: 'undated', showToday: true }),
      todo,
    ];
    expect(mergeToday(base, special).map(t => t.id)).toEqual(['normal', 'undated', 'early']);
    expect(mergeToday(base, special)[2].status).toBe('Done');
  });
});

describe('Todo view filters', () => {
  it.each([
    ['all', null],
    ['open', { statuses: ['Not started', 'In progress'] }],
    ['today', { showToday: true }],
    ['upcoming', { statuses: ['Not started', 'In progress'], dueFrom: '2027-01-01', recurring: false }],
    ['special', { recurring: true, workdayAdjust: true }],
    ['recurring', { recurring: true }],
    ['overdue', { statuses: ['Not started', 'In progress'], dueBefore: '2026-12-31', recurring: false }],
    ['done', { statuses: ['Done'] }],
    ['attention', { hasSetupIssue: true }],
  ])('uses the exact %s contract', (view, filters) => {
    expect(todoViewFilters(view as string, '2026-12-31')).toEqual(filters);
  });
  it('combines debounced search without adding a Today status filter', () => {
    expect(todoViewFilters('today', '2026-09-14', ' report ')).toEqual({ showToday: true, q: 'report' });
  });
});
