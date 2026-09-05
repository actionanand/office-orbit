import { Service } from '@angular/core';
import { ReadFeatureService } from '../../core/api/read-feature.service';
@Service()
export class JiraService extends ReadFeatureService {
  readonly heading = 'JIRAs';
  readonly description = 'Your priorities, blockers, and progress in one place.';
  readonly kind = 'jiras';
  readonly views = [
    { label: 'Active', path: '/api/jiras/active', relations: true },
    { label: 'Blocked', path: '/api/jiras/blocked', relations: true },
    { label: 'Spillovers', path: '/api/jiras/spillovers', relations: true },
    { label: 'Demo Pending', path: '/api/jiras/demo-pending', relations: true },
    { label: 'Demoed', path: '/api/jiras/demoed', relations: true },
    { label: 'Appraisal', path: '/api/jiras/appraisal', relations: true },
    { label: 'All', path: '/api/jiras', relations: true },
  ];
  detail(key: string, refresh = false) {
    return this.api.detail<import('../../shared/models/api.models').Jira>(
      '/api/jiras/' + encodeURIComponent(key),
      { include: 'relations' },
      refresh,
    );
  }
}
