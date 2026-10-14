import { inject, Service } from '@angular/core';
import { firstValueFrom, from, Observable, tap } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { DataCacheService } from '../../core/cache/data-cache.service';
import {
  ReleaseBulkDateRequest,
  ReleaseBulkDateResponse,
  ReleaseCalendarResponse,
  ReleaseDateType,
  ReleaseItem,
  ReleaseCreateRequest,
  ReleasePatchRequest,
  ListResponse,
} from '../../shared/models/api.models';
@Service()
export class ReleaseService extends ReadFeatureService {
  private readonly mutations = inject(MutationApiService);
  private readonly cache = inject(DataCacheService);
  readonly heading = 'Releases';
  readonly description = 'Follow your work from delivery to confirmation.';
  readonly kind = 'releases';
  readonly views = [
    { label: 'Pending', path: '/api/releases/pending', relations: true },
    { label: 'Confirmed', path: '/api/releases/confirmed', relations: true },
    { label: 'Not Announced', path: '/api/releases/not-announced', relations: true },
    { label: 'All', path: '/api/releases', relations: true },
  ];

  metadata(refresh = false) {
    return this.mutations.metadata('/api/releases/meta', refresh);
  }

  create(body: ReleaseCreateRequest) {
    return this.mutations
      .create<ReleaseItem, ReleaseCreateRequest>('/api/releases', body)
      .pipe(tap(() => this.invalidateRelatedData()));
  }

  update(releaseItemId: string, body: ReleasePatchRequest) {
    return this.mutations
      .patch<ReleaseItem, ReleasePatchRequest>('/api/releases', releaseItemId, body)
      .pipe(tap(() => this.invalidateRelatedData()));
  }

  delete(releaseItemId: string) {
    return this.mutations.delete('/api/releases', releaseItemId).pipe(tap(() => this.invalidateRelatedData()));
  }

  bulkSetDate(releaseItemIds: string[], dateType: ReleaseDateType, date: string): Observable<ReleaseBulkDateResponse> {
    const body: ReleaseBulkDateRequest = { releaseItemIds, dateType, date };
    return this.mutations
      .patchEndpoint<ReleaseBulkDateResponse, ReleaseBulkDateRequest>('/api/releases/bulk-date', body, '/api/releases')
      .pipe(tap(() => this.invalidateRelatedData()));
  }

  calendar(dateType: ReleaseDateType, from: string, to: string, refresh = false): Observable<ReleaseCalendarResponse> {
    return this.api.detail<ReleaseCalendarResponse>('/api/releases/calendar', { dateType, from, to }, refresh);
  }

  byDate(dateType: ReleaseDateType, date: string): Observable<ReleaseItem[]> {
    return from(this.allByDate(dateType, date));
  }

  private async allByDate(dateType: ReleaseDateType, date: string): Promise<ReleaseItem[]> {
    const items: ReleaseItem[] = [];
    const ids = new Set<string>();
    const cursors = new Set<string>();
    let cursor: string | null = null;
    for (let page = 0; page < 100; page += 1) {
      if (cursor) {
        if (cursors.has(cursor)) throw new Error('Release date pagination returned a repeated cursor.');
        cursors.add(cursor);
      }
      const response: ListResponse<ReleaseItem> = await firstValueFrom(
        this.api.uncachedList<ReleaseItem>('/api/releases/by-date', {
          dateType,
          date,
          pageSize: '100',
          include: 'relations',
          ...(cursor ? { cursor } : {}),
        }),
      );
      for (const item of response.data)
        if (!ids.has(item.id)) {
          ids.add(item.id);
          items.push(item);
        }
      if (!response.hasMore) return items;
      if (!response.nextCursor) throw new Error('Release date pagination is missing its next cursor.');
      cursor = response.nextCursor;
    }
    throw new Error('Release date pagination exceeded 100 pages.');
  }

  private invalidateRelatedData(): void {
    this.cache.invalidate('/api/jiras');
    this.cache.invalidate('dashboard:');
  }
}
