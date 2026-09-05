import { inject, Service } from '@angular/core';
import { map, Observable } from 'rxjs';
import { ResourceService } from '../../core/api/resource.service';
import { WorkLink } from '../../shared/models/api.models';
import { jiraExternalUrl } from '../../shared/utils/jira';

@Service()
export class JiraLinkService {
  private readonly api = inject(ResourceService);
  externalUrl(jiraKey: string): Observable<string | null> {
    return this.api.list<WorkLink>('/api/work-links/active', { include: 'relations' }).pipe(
      map(response => response.data.find(item => item.type?.trim().toLowerCase() === 'jira base url')?.url ?? null),
      map(baseUrl => jiraExternalUrl(baseUrl, jiraKey)),
    );
  }
}
