import { inject } from '@angular/core';
import { ResourceService } from './resource.service';
import { DomainItem, ResourceView } from '../../shared/models/api.models';
export abstract class ReadFeatureService {
  protected readonly api = inject(ResourceService);
  abstract readonly heading: string;
  abstract readonly description: string;
  abstract readonly kind: string;
  abstract readonly views: ResourceView[];
  list(path: string, filters: Record<string, string> = {}, refresh = false) {
    const view = this.views.find(item => item.path === path);
    if (!view) throw new Error('Unsupported view');
    return this.api.list<DomainItem>(path, view.relations ? { ...filters, include: 'relations' } : filters, refresh);
  }
  updatedAt(path: string, filters: Record<string, string> = {}): number | null {
    const view = this.views.find(item => item.path === path);
    return this.api.updatedAt(path, view?.relations ? { ...filters, include: 'relations' } : filters);
  }
}
