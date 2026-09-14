import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of, throwError } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { OfficeEventsService } from '../office-events/office-events.service';
import { TodoComputedService } from './todo-computed.service';
import { WorkCalendarService } from './work-calendar.service';
import { Todo, TodoQueryFilters } from '../../shared/models/api.models';
import { todoFixture } from './todo.fixture';
import { DataCacheService } from '../../core/cache/data-cache.service';

describe('Computed Today and Special', () => {
  const query = vi.fn();
  const holidays = { holidayDates: vi.fn(() => of({ dates: ['2026-08-31'], warning: '' })) };
  const calendar = { get: vi.fn(() => of({ weekOffDays: ['Saturday', 'Sunday'] })) };
  let service: TodoComputedService;
  beforeEach(() => {
    query.mockReset();
    holidays.holidayDates.mockReset().mockReturnValue(of({ dates: ['2026-08-31'], warning: '' }));
    calendar.get.mockReset().mockReturnValue(of({ weekOffDays: ['Saturday', 'Sunday'] }));
    TestBed.configureTestingModule({
      providers: [
        { provide: MutationApiService, useValue: { query } },
        { provide: OfficeEventsService, useValue: holidays },
        { provide: WorkCalendarService, useValue: calendar },
      ],
    });
    service = TestBed.inject(TodoComputedService);
  });
  const page = (data: Todo[], nextCursor: string | null = null) => ({
    data,
    count: data.length,
    hasMore: Boolean(nextCursor),
    nextCursor,
  });
  it('follows all opaque cursors, deduplicates, caches, and retries after mutation invalidation', async () => {
    query
      .mockReturnValueOnce(of(page([todoFixture({ id: 'one' })], 'opaque/+cursor')))
      .mockReturnValueOnce(of(page([todoFixture({ id: 'one' }), todoFixture({ id: 'two' })])));
    expect((await firstValueFrom(service.all({ recurring: true }))).map(todo => todo.id)).toEqual(['one', 'two']);
    expect(query).toHaveBeenNthCalledWith(2, '/api/todos', {
      filters: { recurring: true },
      pageSize: 100,
      cursor: 'opaque/+cursor',
      includeRelations: false,
    });
    await firstValueFrom(service.all({ recurring: true }));
    expect(query).toHaveBeenCalledTimes(2);
    TestBed.inject(DataCacheService).invalidate('/api/todos');
    query.mockReturnValueOnce(of(page([])));
    await firstValueFrom(service.all({ recurring: true }));
    expect(query).toHaveBeenCalledTimes(3);
  });
  it('fails visibly on repeated cursors and the defensive page cap', async () => {
    query.mockReturnValue(of(page([], 'repeat')));
    await expect(firstValueFrom(service.all({ recurring: true }))).rejects.toThrow('finish loading');
    query.mockImplementation((_path, body: { cursor: string | null }) =>
      of(page([], String(Number(body.cursor ?? 0) + 1))),
    );
    await expect(firstValueFrom(service.all({ recurring: true }, true))).rejects.toThrow('100-page limit');
  });
  it('queries Worker Today without status, merges a future occurrence, and keeps Done last', async () => {
    const future = todoFixture({
      id: 'future',
      recurring: true,
      schedule: 'Monthly',
      monthEnd: 'Last day',
      workdayAdjust: true,
      status: 'Done',
      showToday: false,
    });
    const normal = todoFixture({ id: 'normal', showToday: true });
    query.mockImplementation((_path, body: { filters: TodoQueryFilters }) =>
      of(page(body.filters.showToday ? [normal, future] : [future])),
    );
    const result = await firstValueFrom(service.load('today', '2026-08-28', '', true));
    expect(query).toHaveBeenCalledWith('/api/todos', expect.objectContaining({ filters: { showToday: true } }));
    expect(query).toHaveBeenCalledWith(
      '/api/todos',
      expect.objectContaining({ filters: { recurring: true, workdayAdjust: true } }),
    );
    expect(result.data.map(todo => todo.id)).toEqual(['normal', 'future']);
    expect(result.adjustments['future'][0]).toMatchObject({
      scheduledDate: '2026-08-31',
      reminderDate: '2026-08-28',
      reason: 'Holiday + week off',
    });
    expect(holidays.holidayDates).toHaveBeenCalledWith(true);
    expect(calendar.get).toHaveBeenCalledWith(true);
  });
  it('filters Special locally and makes no mutation calls', async () => {
    query.mockReturnValue(
      of(
        page([
          todoFixture({
            toDo: 'Timesheet',
            recurring: true,
            schedule: 'Monthly',
            monthEnd: 'Last day',
            workdayAdjust: true,
          }),
        ]),
      ),
    );
    expect((await firstValueFrom(service.load('special', '2026-08-28', 'timesheet'))).data).toHaveLength(1);
    expect((await firstValueFrom(service.load('special', '2026-08-28', 'different'))).data).toHaveLength(0);
    expect(query.mock.calls.every(call => call[1].filters.showToday === undefined)).toBe(true);
  });
  it('preserves Today on candidate/settings failure and surfaces holiday warnings', async () => {
    query.mockImplementation((_path, body: { filters: TodoQueryFilters }) =>
      body.filters.showToday ? of(page([todoFixture()])) : throwError(() => new Error('offline')),
    );
    calendar.get.mockReturnValue(throwError(() => new Error('offline')));
    holidays.holidayDates.mockReturnValue(of({ dates: [], warning: 'Holiday adjustments incomplete' }));
    const result = await firstValueFrom(service.load('today', '2026-08-28', ''));
    expect(result.data).toHaveLength(1);
    expect(result.warnings).toHaveLength(3);
  });
});
