import { Service } from '@angular/core';
import { ReadFeatureService } from '../../core/api/read-feature.service';
@Service()
export class ReleaseService extends ReadFeatureService {
  readonly heading = 'Releases';
  readonly description = 'Follow your work from delivery to confirmation.';
  readonly kind = 'releases';
  readonly views = [
    { label: 'All', path: '/api/releases', relations: true },
    { label: 'Pending', path: '/api/releases/pending', relations: true },
    { label: 'Confirmed', path: '/api/releases/confirmed', relations: true },
    { label: 'Not Announced', path: '/api/releases/not-announced', relations: true },
  ];
}
