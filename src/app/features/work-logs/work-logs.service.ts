import { Service } from '@angular/core';
import { ReadFeatureService } from '../../core/api/read-feature.service';
@Service()
export class WorkLogService extends ReadFeatureService {
  readonly heading = 'Work Log';
  readonly description = 'A record of your effort, decisions, and accomplishments.';
  readonly kind = 'work-logs';
  readonly views = [
    { label: 'All', path: '/api/work-logs' },
    { label: 'Appraisal', path: '/api/work-logs/appraisal' },
  ];
}
