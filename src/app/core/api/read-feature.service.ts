import { inject } from '@angular/core';
import { ResourceService } from './resource.service';
import { ResourceView } from '../../shared/models/api.models';
export abstract class ReadFeatureService {
  protected readonly api = inject(ResourceService);
  abstract readonly heading: string;
  abstract readonly description: string;
  abstract readonly kind: string;
  abstract readonly views: ResourceView[];
  list(path: string, filters: Record<string, string> = {}) {
    if (!this.views.some(view => view.path === path)) throw new Error('Unsupported view');
    return this.api.list(path, filters);
  }
}
