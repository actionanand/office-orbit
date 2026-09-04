import { Service } from '@angular/core';
import { ReadFeatureService } from '../../core/api/read-feature.service';
@Service()
export class JiraService extends ReadFeatureService {
  readonly heading = 'JIRAs';
  readonly description = 'Your priorities, blockers, and progress in one place.';
  readonly kind = 'jiras';
  readonly views = [
    { label: 'Active Sprint', path: '/api/jiras/active' },
    { label: 'Blocked', path: '/api/jiras/blocked' },
    { label: 'Spillovers', path: '/api/jiras/spillovers' },
    { label: 'Appraisal', path: '/api/jiras/appraisal' },
    { label: 'Demo Pending', path: '/api/jiras/demo-pending' },
    { label: 'Demoed', path: '/api/jiras/demoed' },
    { label: 'All', path: '/api/jiras' },
  ];
  detail(key: string) {
    return this.api.detail('/api/jiras/' + encodeURIComponent(key));
  }
}
