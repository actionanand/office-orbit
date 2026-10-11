import { HttpClient, HttpContext } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BulkDeleteResponse,
  ListResponse,
  MutationResponse,
  QueryRequest,
  ResourceMetadataResponse,
} from '../../shared/models/api.models';
import { DataCacheService } from '../cache/data-cache.service';
import { API_RETRY_SAFE_MUTATION } from './api-retry-policy';

@Service()
export class MutationApiService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(DataCacheService);

  metadata(path: string, refresh = false): Observable<ResourceMetadataResponse> {
    return this.cache.load(
      `meta:${path}`,
      () => this.http.get<ResourceMetadataResponse>(environment.apiBaseUrl + path),
      refresh,
    );
  }

  create<T, TBody>(path: string, body: TBody): Observable<MutationResponse<T>> {
    return this.http
      .post<MutationResponse<T>>(environment.apiBaseUrl + path, body)
      .pipe(tap(() => this.invalidate(path)));
  }

  patch<T, TBody>(path: string, pageId: string, body: TBody): Observable<MutationResponse<T>> {
    return this.http
      .patch<MutationResponse<T>>(`${environment.apiBaseUrl}${path}/${encodeURIComponent(pageId)}`, body, {
        context: new HttpContext().set(API_RETRY_SAFE_MUTATION, true),
      })
      .pipe(tap(() => this.invalidate(path)));
  }

  patchEndpoint<TResponse, TBody>(path: string, body: TBody, invalidatePrefix = path): Observable<TResponse> {
    return this.http
      .patch<TResponse>(environment.apiBaseUrl + path, body, {
        context: new HttpContext().set(API_RETRY_SAFE_MUTATION, true),
      })
      .pipe(tap(() => this.invalidate(invalidatePrefix)));
  }

  delete(path: string, pageId: string): Observable<void> {
    return this.http
      .delete<void>(`${environment.apiBaseUrl}${path}/${encodeURIComponent(pageId)}`)
      .pipe(tap(() => this.invalidate(path)));
  }

  bulkDelete(path: string, pageIds: string[]): Observable<BulkDeleteResponse> {
    if (pageIds.length === 0 || pageIds.length > 25) throw new Error('Select between 1 and 25 items.');
    return this.http
      .post<BulkDeleteResponse>(`${environment.apiBaseUrl}${path}/bulk-delete`, { pageIds })
      .pipe(tap(() => this.invalidate(path)));
  }

  query<T, TFilters>(path: string, request: QueryRequest<TFilters>): Observable<ListResponse<T>> {
    return this.http.request<ListResponse<T>>('QUERY', environment.apiBaseUrl + path, { body: request });
  }

  private invalidate(path: string): void {
    this.cache.invalidate(path);
    this.cache.invalidate(`cursor:${path}`);
    this.cache.invalidate(`query-cursor:${path}`);
    if (path === '/api/work-logs') {
      this.cache.invalidate('calendar:/api/work-logs');
      this.cache.invalidate('analytics:work-activity:');
    }
    this.cache.invalidate('dashboard:');
  }
}
