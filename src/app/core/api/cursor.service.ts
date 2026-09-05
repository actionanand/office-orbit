import { inject, Service } from '@angular/core';
import { defer, finalize, firstValueFrom, Observable, of, shareReplay } from 'rxjs';
import { DomainItem, ListResponse } from '../../shared/models/api.models';
import { cacheKey, DataCacheService } from '../cache/data-cache.service';
import { ResourceService } from './resource.service';

export interface PaginationRequest {
  pageSize?: number;
  cursor?: string;
}
export interface CursorResult<T> extends ListResponse<T> {
  loadedCursors: string[];
  lastUpdated: number;
}

@Service()
export class CursorService {
  private readonly api = inject(ResourceService);
  private readonly cache = inject(DataCacheService);
  private readonly nextRequests = new Map<string, Observable<CursorResult<DomainItem>>>();
  query<T extends DomainItem>(
    path: string,
    filters: Record<string, string> = {},
    refresh = false,
    more = false,
  ): Observable<CursorResult<T>> {
    const params = { pageSize: '25', ...filters };
    const key = 'cursor:' + cacheKey(path, params) + '#';
    if (refresh) this.cache.invalidate(key);
    const current = this.cache.get<CursorResult<T>>(key);
    if (!more || !current)
      return this.cache.load(key, () =>
        defer(async () => {
          const page = await firstValueFrom(this.api.uncachedList<T>(path, params));
          return { ...page, loadedCursors: [], lastUpdated: Date.now() };
        }),
      );
    if (!current.hasMore) return of(current);
    const requestKey = key + 'more:' + current.nextCursor + ':' + current.lastUpdated;
    const running = this.nextRequests.get(requestKey);
    if (running) return running as Observable<CursorResult<T>>;
    const request = defer(async () => {
      const cursor = current.nextCursor;
      if (!cursor || current.loadedCursors.includes(cursor))
        throw new Error('Unable to continue this list. Please refresh.');
      const generation = this.cache.cleared();
      const page = await firstValueFrom(this.api.uncachedList<T>(path, { ...params, cursor }));
      const data = [...new Map([...current.data, ...page.data].map(item => [item.id, item])).values()];
      const result = {
        ...page,
        data,
        count: data.length,
        loadedCursors: [...current.loadedCursors, cursor],
        lastUpdated: Date.now(),
      };
      if (this.cache.cleared() === generation && this.cache.get(key) === current) this.cache.set(key, result);
      return result;
    }).pipe(
      finalize(() => this.nextRequests.delete(requestKey)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.nextRequests.set(requestKey, request);
    return request;
  }
  /** Fetch only a bounded range; export pages are deliberately not cached. */
  async range<T extends DomainItem>(
    path: string,
    filters: Record<string, string>,
    progress: (count: number) => void = () => {},
  ): Promise<T[]> {
    if (!filters['from'] || !filters['to'] || filters['from'] > filters['to'])
      throw new Error('Choose a valid date range.');
    const rows = new Map<string, T>();
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const page: ListResponse<T> = await firstValueFrom(
        this.api.uncachedList<T>(path, { ...filters, pageSize: '100', ...(cursor ? { cursor } : {}) }),
      );
      for (const row of page.data) rows.set(row.id, row);
      progress(rows.size);
      if (!page.hasMore) break;
      cursor = page.nextCursor;
      if (!cursor || seen.has(cursor)) throw new Error('The report could not be completed. Please retry.');
      seen.add(cursor);
    } while (cursor);
    return [...rows.values()];
  }
}
