import { Service } from '@angular/core';
import { ReadFeatureService } from '../../core/api/read-feature.service';
@Service()
export class FeedbackService extends ReadFeatureService {
  readonly heading = 'Feedback';
  readonly description = 'Turn observations into growth and follow-through.';
  readonly kind = 'feedback';
  readonly views = [
    { label: 'All', path: '/api/feedback', relations: true },
    { label: 'Appraisal', path: '/api/feedback/appraisal', relations: true },
    { label: 'Improvement / Follow-up', path: '/api/feedback/improvement-follow-up', relations: true },
    { label: 'Negative', path: '/api/feedback/negative', relations: true },
  ];
}
