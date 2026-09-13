import { Service, inject } from '@angular/core';
import { Observable, defer, finalize, firstValueFrom, of, shareReplay } from 'rxjs';
import { DomainItem, ListResponse, QueryRequest } from '../../shared/models/api.models';
import { DataCacheService } from '../cache/data-cache.service';
import { MutationApiService } from './mutation-api.service';

export interface QueryCursorResult<T> extends ListResponse<T> {
  loadedCursors: string[];
  lastUpdated: number;
}

@Service()
export class QueryCursorService {
  private readonly api = inject(MutationApiService);
  private readonly cache = inject(DataCacheService);
  private readonly running = new Map<string, Observable<QueryCursorResult<DomainItem>>>();

  query<T extends DomainItem, TFilters>(
    path: string,
    filters: TFilters,
    includeRelations = false,
    refresh = false,
    more = false,
  ): Observable<QueryCursorResult<T>> {
    const key = `query-cursor:${path}:${this.stable(filters)}:${includeRelations}`;
    if (refresh) this.cache.invalidate(key);
    const current = this.cache.get<QueryCursorResult<T>>(key);
    if (!more || !current)
      return this.cache.load(key, () =>
        defer(async () => {
          const page = await firstValueFrom(this.request<T, TFilters>(path, filters, null, includeRelations));
          return { ...page, loadedCursors: [], lastUpdated: Date.now() };
        }),
      );
    if (!current.hasMore) return of(current);
    const cursor = current.nextCursor;
    if (!cursor || current.loadedCursors.includes(cursor))
      throw new Error('Unable to continue this list. Please refresh.');
    const requestKey = `${key}:${cursor}:${current.lastUpdated}`;
    const active = this.running.get(requestKey);
    if (active) return active as Observable<QueryCursorResult<T>>;
    const request = defer(async () => {
      const page = await firstValueFrom(this.request<T, TFilters>(path, filters, cursor, includeRelations));
      const data = [...new Map([...current.data, ...page.data].map(item => [item.id, item])).values()];
      const result = {
        ...page,
        data,
        count: data.length,
        loadedCursors: [...current.loadedCursors, cursor],
        lastUpdated: Date.now(),
      };
      if (this.cache.get(key) === current) this.cache.set(key, result);
      return result;
    }).pipe(
      finalize(() => this.running.delete(requestKey)),
      shareReplay({ bufferSize: 1, refCount: true }),
    );
    this.running.set(requestKey, request);
    return request;
  }

  private request<T extends DomainItem, TFilters>(
    path: string,
    filters: TFilters,
    cursor: string | null,
    includeRelations: boolean,
  ) {
    const body: QueryRequest<TFilters> = { filters, pageSize: 25, cursor, includeRelations };
    return this.api.query<T, TFilters>(path, body);
  }

  private stable(value: unknown): string {
    if (!value || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(item => this.stable(item)).join(',')}]`;
    return `{${Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${this.stable(item)}`)
      .join(',')}}`;
  }
}
