import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  DomainItem,
  ListResponse,
  MemoDetail,
  ReferenceImportAccepted,
  ReferenceImportStatus,
  ReferenceLibraryDetail,
  ReferenceLibraryItem,
} from '../../shared/models/api.models';
import { CursorResult, CursorService } from '../../core/api/cursor.service';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { QueryCursorResult, QueryCursorService } from '../../core/api/query-cursor.service';
import { DataCacheService } from '../../core/cache/data-cache.service';

export type ProductivityKind = 'todos' | 'tasks' | 'memos';

@Service()
export class ProductivityService {
  private readonly http = inject(HttpClient);
  private readonly cursors = inject(CursorService);
  private readonly queryCursors = inject(QueryCursorService);
  private readonly mutations = inject(MutationApiService);
  private readonly cache = inject(DataCacheService);

  list<T extends DomainItem>(
    kind: ProductivityKind,
    filters: object | null,
    refresh = false,
    more = false,
  ): Observable<ProductivityListResult<T>> {
    const path = `/api/${kind}`;
    if (filters) return this.queryCursors.query<T, object>(path, filters, kind === 'tasks', refresh, more);
    return this.cursors.query<T>(path, kind === 'tasks' ? { include: 'relations' } : {}, refresh, more);
  }

  metadata(kind: ProductivityKind, refresh = false) {
    return this.mutations.metadata(`/api/${kind}/meta`, refresh);
  }

  create<T, TBody>(kind: ProductivityKind, body: TBody) {
    return this.mutations.create<T, TBody>(`/api/${kind}`, body);
  }

  patch<T, TBody>(kind: ProductivityKind, id: string, body: TBody) {
    return this.mutations.patch<T, TBody>(`/api/${kind}`, id, body);
  }

  delete(kind: ProductivityKind, id: string) {
    return this.mutations.delete(`/api/${kind}`, id);
  }

  bulkDelete(kind: ProductivityKind, ids: string[]) {
    return this.mutations.bulkDelete(`/api/${kind}`, ids);
  }

  detailMemo(id: string, refresh = false) {
    return this.detail<MemoDetail>(`/api/memos/${encodeURIComponent(id)}`, refresh);
  }

  referenceList(refresh = false, cursor?: string) {
    const params = new HttpParams({ fromObject: { pageSize: '25', ...(cursor ? { cursor } : {}) } });
    return this.http
      .get<ListResponse<ReferenceLibraryItem>>(`${environment.apiBaseUrl}/api/reference-library`, { params })
      .pipe(timeout(15000));
  }

  referenceDetail(id: string, refresh = false) {
    return this.detail<ReferenceLibraryDetail>(`/api/reference-library/${encodeURIComponent(id)}`, refresh);
  }

  importMarkdown(file: File) {
    const body = new FormData();
    body.append('file', file);
    return this.http
      .post<{ data: { id: string; title: string } } | ReferenceImportAccepted>(
        `${environment.apiBaseUrl}/api/reference-library/import`,
        body,
        { observe: 'response' },
      )
      .pipe(timeout(60000));
  }

  importStatus(taskId: string) {
    return this.http
      .get<ReferenceImportStatus>(
        `${environment.apiBaseUrl}/api/reference-library/imports/${encodeURIComponent(taskId)}`,
      )
      .pipe(timeout(15000));
  }

  async pollImport(
    initial: ReferenceImportAccepted,
    signal: AbortSignal,
    onProgress?: (status: ReferenceImportStatus['status']) => void,
  ): Promise<ReferenceImportStatus> {
    let waitSeconds = Math.max(1, initial.pollAfterSeconds);
    const deadline = Date.now() + 10 * 60_000;
    onProgress?.('queued');
    while (Date.now() < deadline) {
      await this.delay(waitSeconds * 1000, signal);
      const result = await firstValueFrom(this.importStatus(initial.taskId));
      onProgress?.(result.status);
      if (result.status === 'succeeded' || result.status === 'failed') return result;
      waitSeconds = Math.max(1, result.pollAfterSeconds ?? waitSeconds);
    }
    throw new Error('The import is still processing. Refresh the library later.');
  }

  clearReferenceCache(): void {
    this.cache.invalidate('/api/reference-library');
  }

  private detail<T>(path: string, refresh: boolean) {
    return this.cache.load(path, () => this.http.get<T>(environment.apiBaseUrl + path).pipe(timeout(15000)), refresh);
  }

  private delay(milliseconds: number, signal: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timer = window.setTimeout(resolve, milliseconds);
      signal.addEventListener(
        'abort',
        () => {
          window.clearTimeout(timer);
          reject(new DOMException('Import polling stopped.', 'AbortError'));
        },
        { once: true },
      );
    });
  }
}

export type ProductivityListResult<T> = CursorResult<T> | QueryCursorResult<T>;
export type ReferenceImportResponse = HttpResponse<{ data: { id: string; title: string } } | ReferenceImportAccepted>;
