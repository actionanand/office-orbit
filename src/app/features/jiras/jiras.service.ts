import { Service, inject } from '@angular/core';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { Jira, JiraCreateRequest, JiraDetail } from '../../shared/models/api.models';
@Service()
export class JiraService extends ReadFeatureService {
  private readonly mutations = inject(MutationApiService);
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
    return this.api.detail<JiraDetail>('/api/jiras/' + encodeURIComponent(key), { include: 'relations' }, refresh);
  }
  metadata(refresh = false) {
    return this.mutations.metadata('/api/jiras/meta', refresh);
  }
  create(body: JiraCreateRequest) {
    return this.mutations.create<Jira, JiraCreateRequest>('/api/jiras', body);
  }
}
