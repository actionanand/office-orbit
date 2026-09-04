import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { map, Observable, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiItem, ListResponse } from '../../shared/models/api.models';

@Service()
export class ResourceService {
  private readonly http = inject(HttpClient);
  list(path: string, filters: Record<string, string> = {}): Observable<ListResponse<ApiItem>> {
    const params = Object.entries(filters).reduce(
      (value, [key, entry]) => (entry ? value.set(key, entry) : value),
      new HttpParams(),
    );
    return this.http.get<unknown>(`${environment.apiBaseUrl}${path}`, { params }).pipe(
      timeout(15000),
      map(response => this.normalize(response)),
    );
  }
  detail(path: string): Observable<ApiItem> {
    return this.http.get<ApiItem>(`${environment.apiBaseUrl}${path}`).pipe(timeout(15000));
  }
  private normalize(response: unknown): ListResponse<ApiItem> {
    if (Array.isArray(response))
      return { data: response.filter(this.item), count: response.length, hasMore: false, nextCursor: null };
    if (this.item(response) && Array.isArray(response['data'])) {
      const data = response['data'].filter(this.item);
      return {
        data,
        count: typeof response['count'] === 'number' ? response['count'] : data.length,
        hasMore: response['hasMore'] === true,
        nextCursor: typeof response['nextCursor'] === 'string' ? response['nextCursor'] : null,
      };
    }
    if (this.item(response)) return { data: [response], count: 1, hasMore: false, nextCursor: null };
    return { data: [], count: 0, hasMore: false, nextCursor: null };
  }
  private readonly item = (value: unknown): value is ApiItem =>
    typeof value === 'object' && value !== null && !Array.isArray(value);
}
