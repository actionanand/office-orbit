import { inject, Service } from '@angular/core';
import { defer, firstValueFrom, Observable } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { DataCacheService } from '../../core/cache/data-cache.service';
import { ListResponse, ResourceMetadataResponse, WorkLog, WorkLogQueryFilters } from '../../shared/models/api.models';
@Service()
export class WorkLogService extends ReadFeatureService {
  private readonly mutations = inject(MutationApiService);
  private readonly cache = inject(DataCacheService);
  readonly heading = 'Work Log';
  readonly description = 'A record of your effort, decisions, and accomplishments.';
  readonly kind = 'work-logs';
  readonly views = [
    { label: 'All', path: '/api/work-logs', relations: true },
    { label: 'Appraisal', path: '/api/work-logs/appraisal', relations: true },
  ];

  metadata(refresh = false): Observable<ResourceMetadataResponse> {
    return this.mutations.metadata('/api/work-logs/meta', refresh);
  }

  query(filters: WorkLogQueryFilters, cursor: string | null = null): Observable<ListResponse<WorkLog>> {
    return this.mutations.query<WorkLog, WorkLogQueryFilters>('/api/work-logs', {
      filters,
      pageSize: 25,
      cursor,
      includeRelations: true,
    });
  }

  queryAll(filters: WorkLogQueryFilters, refresh = false): Promise<ListResponse<WorkLog>> {
    const key = `calendar:/api/work-logs:QUERY:${this.filterKey(filters)}`;
    return firstValueFrom(this.cache.load(key, () => defer(() => this.fetchAll(filters)), refresh));
  }

  private async fetchAll(filters: WorkLogQueryFilters): Promise<ListResponse<WorkLog>> {
    const data: WorkLog[] = [];
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      const page: ListResponse<WorkLog> = await firstValueFrom(this.query(filters, cursor));
      data.push(...page.data);
      cursor = page.hasMore ? page.nextCursor : null;
      if (cursor && seen.has(cursor)) throw new Error('The server returned a repeated pagination cursor.');
      if (cursor) seen.add(cursor);
    } while (cursor);
    return { data, count: data.length, hasMore: false, nextCursor: null };
  }

  private filterKey(filters: WorkLogQueryFilters): string {
    return JSON.stringify({
      appraisal: filters.appraisal ?? null,
      categories: [...(filters.categories ?? [])].sort(),
      from: filters.from ?? '',
      jiraIds: [...(filters.jiraIds ?? [])].sort(),
      projectIds: [...(filters.projectIds ?? [])].sort(),
      to: filters.to ?? '',
      types: [...(filters.types ?? [])].sort(),
      workModes: [...(filters.workModes ?? [])].sort(),
    });
  }
}
