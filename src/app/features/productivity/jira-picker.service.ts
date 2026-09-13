import { inject, Service } from '@angular/core';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { JiraOption, JiraOptionQueryFilters, QueryRequest } from '../../shared/models/api.models';

@Service()
export class JiraPickerService {
  private readonly api = inject(MutationApiService);

  query(q = '', cursor: string | null = null) {
    const search = q.trim();
    const request: QueryRequest<JiraOptionQueryFilters> = {
      filters: search ? { q: search } : {},
      pageSize: 20,
      cursor,
      includeRelations: false,
    };
    return this.api.query<JiraOption, JiraOptionQueryFilters>('/api/jiras/options', request);
  }
}
