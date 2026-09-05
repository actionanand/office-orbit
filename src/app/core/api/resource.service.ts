import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DomainItem, ListResponse } from '../../shared/models/api.models';
import { cacheKey, DataCacheService } from '../cache/data-cache.service';

@Service()
export class ResourceService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(DataCacheService);
  list<T extends DomainItem>(
    path: string,
    filters: Record<string, string> = {},
    refresh = false,
  ): Observable<ListResponse<T>> {
    filters = { pageSize: '25', ...filters };
    const params = Object.entries(filters).reduce(
      (value, [key, entry]) => (entry ? value.set(key, entry) : value),
      new HttpParams(),
    );
    return this.cache.load(
      cacheKey(path, filters),
      () =>
        this.http.get<unknown>(`${environment.apiBaseUrl}${path}`, { params }).pipe(
          timeout(15000),
          map(response => this.normalize<T>(response)),
          tap(response => this.seedJiraDetails(path, response.data)),
        ),
      refresh,
    );
  }
  detail<T extends DomainItem>(path: string, filters: Record<string, string> = {}, refresh = false): Observable<T> {
    const params = Object.entries(filters).reduce(
      (value, [key, entry]) => (entry ? value.set(key, entry) : value),
      new HttpParams(),
    );
    return this.cache.load(
      cacheKey(path, filters),
      () => this.http.get<T>(`${environment.apiBaseUrl}${path}`, { params }).pipe(timeout(15000)),
      refresh,
    );
  }
  updatedAt(path: string, filters: Record<string, string> = {}): number | null {
    return this.cache.updatedAt(cacheKey(path, { pageSize: '25', ...filters }));
  }
  uncachedList<T extends DomainItem>(path: string, filters: Record<string, string>): Observable<ListResponse<T>> {
    const params = new HttpParams({
      fromObject: Object.fromEntries(Object.entries(filters).filter(([, value]) => value)),
    });
    return this.http.get<unknown>(environment.apiBaseUrl + path, { params }).pipe(
      timeout(15000),
      map(response => this.normalize<T>(response)),
      tap(response => this.seedJiraDetails(path, response.data)),
    );
  }
  private normalize<T extends DomainItem>(response: unknown): ListResponse<T> {
    if (Array.isArray(response)) {
      const data = response.filter(this.item) as T[];
      return { data, count: data.length, hasMore: false, nextCursor: null };
    }
    if (this.item(response) && Array.isArray(response['data'])) {
      const data = response['data'].filter(this.item) as T[];
      return {
        data,
        count: typeof response['count'] === 'number' ? response['count'] : data.length,
        hasMore: response['hasMore'] === true,
        nextCursor: typeof response['nextCursor'] === 'string' ? response['nextCursor'] : null,
      };
    }
    if (this.item(response)) return { data: [response as T], count: 1, hasMore: false, nextCursor: null };
    return { data: [], count: 0, hasMore: false, nextCursor: null };
  }
  private readonly item = (value: unknown): value is Readonly<Record<string, unknown>> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  private seedJiraDetails(path: string, items: DomainItem[]): void {
    if (!path.startsWith('/api/jiras')) return;
    for (const item of items) {
      if ('jiraKey' in item && item.jiraKey)
        this.cache.set(cacheKey(`/api/jiras/${encodeURIComponent(item.jiraKey)}`, { include: 'relations' }), item);
    }
  }
}
