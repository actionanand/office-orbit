import { HttpClient } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ListResponse, MutationResponse, QueryRequest, ResourceMetadataResponse } from '../../shared/models/api.models';
import { DataCacheService } from '../cache/data-cache.service';

@Service()
export class MutationApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(DataCacheService);

  metadata(path: string, refresh = false): Observable<ResourceMetadataResponse> {
    return this.cache.load(
      `meta:${path}`,
      () => this.http.get<ResourceMetadataResponse>(environment.apiBaseUrl + path).pipe(timeout(15000)),
      refresh,
    );
  }

  create<T, TBody>(path: string, body: TBody): Observable<MutationResponse<T>> {
    return this.http.post<MutationResponse<T>>(environment.apiBaseUrl + path, body).pipe(
      timeout(15000),
      tap(() => this.invalidate(path)),
    );
  }

  patch<T, TBody>(path: string, pageId: string, body: TBody): Observable<MutationResponse<T>> {
    return this.http
      .patch<MutationResponse<T>>(`${environment.apiBaseUrl}${path}/${encodeURIComponent(pageId)}`, body)
      .pipe(
        timeout(15000),
        tap(() => this.invalidate(path)),
      );
  }

  query<T, TFilters>(path: string, request: QueryRequest<TFilters>): Observable<ListResponse<T>> {
    return this.http
      .request<ListResponse<T>>('QUERY', environment.apiBaseUrl + path, { body: request })
      .pipe(timeout(15000));
  }

  private invalidate(path: string): void {
    this.cache.invalidate(path);
    this.cache.invalidate(`cursor:${path}`);
    if (path === '/api/work-logs') {
      this.cache.invalidate('calendar:/api/work-logs');
      this.cache.invalidate('analytics:work-activity:');
    }
    this.cache.invalidate('dashboard:');
  }
}
