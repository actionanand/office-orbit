import { Service, inject } from '@angular/core';
import { Observable, catchError, defer, firstValueFrom, forkJoin, map, of } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { DataCacheService } from '../../core/cache/data-cache.service';
import { ListResponse, Todo, TodoQueryFilters } from '../../shared/models/api.models';
import { OfficeEventsService } from '../office-events/office-events.service';
import { AdjustedReminder, mergeToday, recurrenceSummary, specialRemindersForDate } from './todo-recurrence';
import { WorkCalendarService } from './work-calendar.service';

export interface ComputedTodos {
  data: Todo[];
  adjustments: Record<string, AdjustedReminder[]>;
  warnings: string[];
}
@Service()
export class TodoComputedService {
  private readonly api = inject(MutationApiService);
  private readonly cache = inject(DataCacheService);
  private readonly events = inject(OfficeEventsService);
  private readonly calendar = inject(WorkCalendarService);

  /** Independent of UI cursor state, with a hard cap that fails visibly instead of returning a partial result. */
  all(filters: TodoQueryFilters, refresh = false): Observable<Todo[]> {
    const key = '/api/todos:computed:' + JSON.stringify(filters);
    return this.cache.load(
      key,
      () =>
        defer(async () => {
          const todos = new Map<string, Todo>(),
            seen = new Set<string>();
          let cursor: string | null = null;
          for (let index = 0; index < 100; index++) {
            const page: ListResponse<Todo> = await firstValueFrom(
              this.api.query<Todo, TodoQueryFilters>('/api/todos', {
                filters,
                pageSize: 100,
                cursor,
                includeRelations: false,
              }),
            );
            for (const todo of page.data) todos.set(todo.id, todo);
            if (!page.hasMore) return [...todos.values()];
            cursor = page.nextCursor;
            if (!cursor || seen.has(cursor))
              throw new Error('Unable to finish loading recurring tasks. Refresh to try again.');
            seen.add(cursor);
          }
          throw new Error('Too many tasks to calculate all reminders (100-page limit). Narrow your data and retry.');
        }),
      refresh,
    );
  }

  load(view: 'today' | 'special', today: string, q: string, refresh = false): Observable<ComputedTodos> {
    return forkJoin({
      base:
        view === 'today'
          ? this.all({ showToday: true, ...(q.trim() ? { q: q.trim() } : {}) }, refresh)
          : of([] as Todo[]),
      candidates: this.all({ recurring: true, workdayAdjust: true }, refresh).pipe(
        map(data => ({ data, warning: '' })),
        catchError(() => of({ data: [] as Todo[], warning: 'Early reminders could not be loaded. Refresh to retry.' })),
      ),
      holidays: this.events.holidayDates(refresh),
      calendar: this.calendar.get(refresh).pipe(
        map(data => ({ data, warning: '' })),
        catchError(() =>
          of({
            data: null,
            warning:
              'Work calendar could not be loaded. Early reminders are unavailable; Today still shows Worker results.',
          }),
        ),
      ),
    }).pipe(
      map(({ base, candidates, holidays, calendar }) => {
        const special = calendar.data
          ? specialRemindersForDate(candidates.data, today, calendar.data.weekOffDays, new Set(holidays.dates))
          : [];
        const matching = special.filter(
          ({ todo }) =>
            !q.trim() ||
            `${todo.toDo} ${todo.notes} ${recurrenceSummary(todo)}`.toLowerCase().includes(q.trim().toLowerCase()),
        );
        return {
          data: mergeToday(base, matching),
          adjustments: Object.fromEntries(matching.map(item => [item.todo.id, item.reminders])),
          warnings: [candidates.warning, holidays.warning, calendar.warning].filter(Boolean),
        };
      }),
    );
  }
}
