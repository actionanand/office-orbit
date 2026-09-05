import { computed, effect, inject, Service, signal } from '@angular/core';
import { defer, firstValueFrom } from 'rxjs';
import { CursorService } from '../../core/api/cursor.service';
import { cacheKey } from '../../core/cache/data-cache.service';
import { apiError } from '../../core/api/api-error';
import { WorkLog } from '../../shared/models/api.models';
import { currentMonth, monthRange, shiftMonth } from './calendar';
import { WorkLogService } from './work-logs.service';
import { DataCacheService } from '../../core/cache/data-cache.service';

export type WorkLogViewMode = 'list' | 'calendar';
export interface WorkLogFilters {
  from: string;
  to: string;
  category: string;
  type: string;
  workMode: string;
}

const emptyFilters: WorkLogFilters = { from: '', to: '', category: '', type: '', workMode: '' };

@Service()
export class WorkLogStore {
  private readonly service = inject(WorkLogService);
  private readonly cursors = inject(CursorService);
  private requestVersion = 0;
  readonly loadingMore = signal(false);
  private readonly cache = inject(DataCacheService);
  readonly mode = signal<WorkLogViewMode>(
    localStorage.getItem('office-orbit.work-log-view') === 'calendar' ? 'calendar' : 'list',
  );
  readonly selectedPath = signal('/api/work-logs');
  readonly filters = signal<WorkLogFilters>({ ...emptyFilters });
  readonly search = signal('');
  readonly month = signal(currentMonth());
  readonly selectedDate = signal<string | null>(null);
  readonly items = signal<WorkLog[]>([]);
  readonly count = signal(0);
  readonly hasMore = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly lastUpdated = signal<number | null>(null);
  readonly visible = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term ? this.items().filter(item => this.searchText(item).includes(term)) : this.items();
  });

  constructor() {
    effect(() => {
      if (this.cache.cleared() === 0) return;
      this.requestVersion += 1;
      this.loading.set(false);
      this.loadingMore.set(false);
      this.items.set([]);
      this.count.set(0);
      this.hasMore.set(false);
      this.nextCursor.set(null);
      this.lastUpdated.set(null);
      this.error.set('');
      this.search.set('');
      this.selectedDate.set(null);
    });
  }

  setMode(mode: WorkLogViewMode): void {
    this.mode.set(mode);
    localStorage.setItem('office-orbit.work-log-view', mode);
    void this.load(false);
  }

  setMonth(month: string): void {
    this.month.set(month);
    this.selectedDate.set(null);
    void this.load(false);
  }

  moveMonth(offset: number): void {
    this.setMonth(shiftMonth(this.month(), offset));
  }

  async load(refresh: boolean, more = false): Promise<void> {
    if (more && (this.loadingMore() || this.loading())) return;
    const version = ++this.requestVersion;
    this.loading.set(!more);
    this.loadingMore.set(more);
    this.error.set('');
    const calendarMode = this.mode() === 'calendar';
    const requestPath = calendarMode ? '/api/work-logs' : this.selectedPath();
    const filters: Record<string, string> = calendarMode
      ? { ...this.filters(), ...monthRange(this.month()) }
      : this.selectedPath() === '/api/work-logs'
        ? { ...this.filters() }
        : { ...emptyFilters };
    try {
      const response = calendarMode
        ? await firstValueFrom(
            this.cache.load(
              'calendar:' + cacheKey(requestPath, { ...filters, include: 'relations' }) + '#',
              () =>
                defer(async () => {
                  const data = await this.cursors.range<WorkLog>(requestPath, { ...filters, include: 'relations' });
                  return { data, count: data.length, hasMore: false, nextCursor: null, lastUpdated: Date.now() };
                }),
              refresh,
            ),
          )
        : await firstValueFrom(this.service.list(requestPath, filters, refresh, more));
      if (version !== this.requestVersion) return;
      const items = response.data as WorkLog[];
      this.items.set(this.selectedPath().endsWith('/appraisal') ? items.filter(item => item.appraisal) : items);
      this.count.set(this.items().length);
      this.hasMore.set(response.hasMore);
      this.nextCursor.set(response.nextCursor);
      this.lastUpdated.set(response.lastUpdated);
    } catch (error) {
      if (version === this.requestVersion) this.error.set(apiError(error));
    } finally {
      if (version === this.requestVersion) {
        this.loading.set(false);
        this.loadingMore.set(false);
      }
    }
  }

  private searchText(item: WorkLog): string {
    return [
      item.update,
      item.category,
      item.type,
      item.workMode,
      item.comment,
      item.jiras?.map(jira => jira.key).join(' '),
      item.projects?.map(project => project.name).join(' '),
    ]
      .join(' ')
      .toLowerCase();
  }
}
