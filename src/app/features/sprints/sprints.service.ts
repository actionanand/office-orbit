import { Service } from '@angular/core';
import { catchError, forkJoin, map, of } from 'rxjs';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { SprintAllocation, SprintDetailJira, SprintDetailResponse } from '../../shared/models/api.models';
@Service()
export class SprintService extends ReadFeatureService {
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
}
