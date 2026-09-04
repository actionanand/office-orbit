import { Service } from '@angular/core';
import { ReadFeatureService } from '../../core/api/read-feature.service';
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
}
