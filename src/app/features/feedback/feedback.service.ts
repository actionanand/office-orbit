import { Service } from '@angular/core';
import { ReadFeatureService } from '../../core/api/read-feature.service';
@Service()
export class FeedbackService extends ReadFeatureService {
  readonly heading = 'Feedback';
  readonly description = 'Turn observations into growth and follow-through.';
  readonly kind = 'feedback';
  readonly views = [
    { label: 'All', path: '/api/feedback' },
    { label: 'Appraisal', path: '/api/feedback/appraisal' },
    { label: 'Improvement / Follow-up', path: '/api/feedback/improvement-follow-up' },
    { label: 'Negative', path: '/api/feedback/negative' },
  ];
}
