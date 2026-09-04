import { Service } from '@angular/core';
import { ReadFeatureService } from '../../core/api/read-feature.service';
@Service()
export class WorkLinksService extends ReadFeatureService {
  readonly heading = 'Work Links';
  readonly description = 'The resources and references that keep work moving.';
  readonly kind = 'work-links';
  readonly views = [
    { label: 'Active', path: '/api/work-links/active' },
    { label: 'All', path: '/api/work-links' },
  ];
}
