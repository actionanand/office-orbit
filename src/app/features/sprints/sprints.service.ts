import { inject, Service } from '@angular/core';
import { catchError, forkJoin, map, of, tap } from 'rxjs';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { DataCacheService } from '../../core/cache/data-cache.service';
import { MutationApiService } from '../../core/api/mutation-api.service';
import {
  ListResponse,
  Sprint,
  SprintAllocation,
  SprintAllocationPatchData,
  SprintAllocationPatchRequest,
  SprintAllocationPlanRequest,
  SprintAllocationPlanResponse,
  SprintAllocationSyncResponse,
  SprintCreateRequest,
  SprintDetailJira,
  SprintDetailResponse,
  SprintPatchRequest,
} from '../../shared/models/api.models';
@Service()
export class SprintService extends ReadFeatureService {
  private readonly mutations = inject(MutationApiService);
  private readonly cache = inject(DataCacheService);
  readonly heading = 'Sprints';
  readonly description = 'Keep capacity and commitments in balance.';
  readonly kind = 'sprints';
  readonly views = [
    { label: 'Active', path: '/api/sprints/active', relations: true },
    { label: 'History', path: '/api/sprints/history', relations: true },
    { label: 'Current Allocations', path: '/api/sprint-allocations/current' },
    { label: 'All Allocations', path: '/api/sprint-allocations' },
    { label: 'All', path: '/api/sprints', relations: true },
  ];

  detail(sprintId: string, refresh = false) {
    return this.api.detail<SprintDetailResponse>(`/api/sprints/${encodeURIComponent(sprintId)}`, {}, refresh);
  }

  active(refresh = false) {
    return this.api.detail<ListResponse<Sprint>>('/api/sprints/active', { include: 'relations' }, refresh);
  }

  create(body: SprintCreateRequest) {
    return this.mutations
      .create<Sprint, SprintCreateRequest>('/api/sprints', body)
      .pipe(tap(() => this.invalidateRelatedData()));
  }

  update(sprintId: string, body: SprintPatchRequest) {
    return this.mutations
      .patch<Sprint, SprintPatchRequest>('/api/sprints', sprintId, body)
      .pipe(tap(() => this.invalidateRelatedData()));
  }

  updatePlannedDays(allocationId: string, plannedDays: number) {
    const body: SprintAllocationPatchRequest = { plannedDays };
    return this.mutations
      .patch<SprintAllocationPatchData, SprintAllocationPatchRequest>('/api/sprint-allocations', allocationId, body)
      .pipe(
        map(response => {
          this.cache.invalidate('/api/sprints');
          this.cache.invalidate('dashboard:');
          return response;
        }),
      );
  }

  syncCurrentSprintAllocations() {
    return this.mutations
      .patchEndpoint<SprintAllocationSyncResponse, Record<string, never>>('/api/sprints/active/allocations/sync', {})
      .pipe(tap(() => this.invalidateRelatedData()));
  }

  planCurrentSprintAllocations(body: SprintAllocationPlanRequest) {
    return this.mutations
      .patchEndpoint<SprintAllocationPlanResponse, SprintAllocationPlanRequest>(
        '/api/sprints/active/allocations/plan',
        body,
      )
      .pipe(tap(() => this.invalidateRelatedData()));
  }

  allocationJiras(allocations: SprintAllocation[], refresh = false) {
    const sprintIds = [...new Set(allocations.flatMap(allocation => allocation.sprintIds))];
    if (sprintIds.length === 0) return of<Record<string, SprintDetailJira[]>>({});

    return forkJoin(sprintIds.map(sprintId => this.detail(sprintId, refresh).pipe(catchError(() => of(null))))).pipe(
      map(details =>
        Object.fromEntries(
          allocations.map(allocation => {
            const matches = details
              .flatMap(detail => detail?.jiras ?? [])
              .filter(jira => allocation.jiraIds.includes(jira.id) || jira.allocationId === allocation.id);
            return [allocation.id, [...new Map(matches.map(jira => [jira.id, jira])).values()]];
          }),
        ),
      ),
    );
  }

  private invalidateRelatedData(): void {
    this.cache.invalidate('/api/sprints');
    this.cache.invalidate('/api/sprint-allocations');
    this.cache.invalidate('/api/jiras');
    this.cache.invalidate('dashboard:');
  }
}
