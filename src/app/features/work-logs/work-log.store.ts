import { computed, effect, inject, Service, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { WorkLog, WorkLogQueryFilters } from '../../shared/models/api.models';
import { currentMonth, monthRange, shiftMonth } from './calendar';
import { WorkLogService } from './work-logs.service';
import { DataCacheService } from '../../core/cache/data-cache.service';

export type WorkLogViewMode = 'list' | 'calendar';
export interface WorkLogFilters {
  from: string;
  to: string;
  categories: string[];
  types: string[];
  workModes: string[];
}

const emptyFilters: WorkLogFilters = { from: '', to: '', categories: [], types: [], workModes: [] };

@Service()
export class WorkLogStore {
  private readonly service = inject(WorkLogService);
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
  readonly notice = signal('');
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
      this.notice.set('');
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

  async load(refresh: boolean, more = false, preserveVisible = false): Promise<void> {
    if (more && (this.loadingMore() || this.loading())) return;
    const version = ++this.requestVersion;
    this.loading.set(!more && !preserveVisible);
    this.loadingMore.set(more);
    this.error.set('');
    this.notice.set('');
    const calendarMode = this.mode() === 'calendar';
    const requestPath = calendarMode ? '/api/work-logs' : this.selectedPath();
    const queryFilters = this.queryFilters(calendarMode);
    const hasQueryFilters = Boolean(
      queryFilters.from ||
      queryFilters.to ||
      queryFilters.categories?.length ||
      queryFilters.types?.length ||
      queryFilters.workModes?.length,
    );
    try {
      const response = calendarMode
        ? await this.service.queryAll(queryFilters, refresh)
        : requestPath === '/api/work-logs' && hasQueryFilters
          ? await firstValueFrom(this.service.query(queryFilters, more ? this.nextCursor() : null))
          : await firstValueFrom(this.service.list(requestPath, {}, refresh, more));
      if (version !== this.requestVersion) return;
      const items = response.data as WorkLog[];
      const merged = more ? this.merge(this.items(), items) : items;
      this.items.set(this.selectedPath().endsWith('/appraisal') ? merged.filter(item => item.appraisal) : merged);
      this.count.set(this.items().length);
      this.hasMore.set(response.hasMore);
      this.nextCursor.set(response.nextCursor);
      this.lastUpdated.set('lastUpdated' in response ? response.lastUpdated : Date.now());
    } catch (error) {
      if (version === this.requestVersion) {
        if (preserveVisible) this.notice.set('Saved, but the latest list could not be refreshed. Try Refresh.');
        else this.error.set(apiError(error));
      }
    } finally {
      if (version === this.requestVersion) {
        this.loading.set(false);
        this.loadingMore.set(false);
      }
    }
  }

  upsert(item: WorkLog): void {
    const index = this.items().findIndex(current => current.id === item.id);
    this.items.update(items =>
      index < 0 ? [item, ...items] : items.map(current => (current.id === item.id ? item : current)),
    );
  }

  private merge(current: WorkLog[], incoming: WorkLog[]): WorkLog[] {
    const seen = new Set(current.map(item => item.id));
    return [...current, ...incoming.filter(item => !seen.has(item.id))];
  }

  private queryFilters(calendarMode: boolean): WorkLogQueryFilters {
    const filters = this.filters();
    const dates = calendarMode ? monthRange(this.month()) : { from: filters.from, to: filters.to };
    return {
      ...(dates.from ? { from: dates.from } : {}),
      ...(dates.to ? { to: dates.to } : {}),
      ...(filters.categories.length ? { categories: filters.categories } : {}),
      ...(filters.types.length ? { types: filters.types } : {}),
      ...(filters.workModes.length ? { workModes: filters.workModes } : {}),
      ...(calendarMode && this.selectedPath().endsWith('/appraisal') ? { appraisal: true } : {}),
    };
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
