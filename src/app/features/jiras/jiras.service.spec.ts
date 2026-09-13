import { TestBed } from '@angular/core/testing';
import { Observable, firstValueFrom, of } from 'rxjs';
import { CursorService } from '../../core/api/cursor.service';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { ResourceService } from '../../core/api/resource.service';
import { JiraDetail } from '../../shared/models/api.models';
import { JiraService } from './jiras.service';

describe('JiraService', () => {
  it('requests relation-enriched JiraDetail through the existing detail cache', async () => {
    const jira: JiraDetail = {
      id: 'jira-id',
      createdTime: '',
      lastEditedTime: '',
      jiraKey: 'CRI-1',
      summary: '',
      status: null,
      tags: [],
      appraisal: false,
      spillover: false,
      spilloverCount: 0,
      spilloverReason: '',
      inActiveSprint: false,
      demoRequired: false,
      demoedDate: null,
      demoNotes: '',
      sprintIds: [],
      projectIds: [],
      blockedByIds: [],
      releaseItemIds: [],
      sprintHistory: [],
      spillEvents: [],
      latestSpill: null,
    };
    const detail = vi.fn(() => of(jira));
    const metadata = vi.fn(() => of({ resource: 'jiras', fields: [] }));
    const create = vi.fn(() => of({ data: jira }));
    TestBed.configureTestingModule({
      providers: [
        JiraService,
        { provide: ResourceService, useValue: { detail } },
        { provide: CursorService, useValue: {} },
        { provide: MutationApiService, useValue: { metadata, create } },
      ],
    });
    const result: Observable<JiraDetail> = TestBed.inject(JiraService).detail('CRI/1', true);
    await expect(firstValueFrom(result)).resolves.toBe(jira);
    expect(detail).toHaveBeenCalledWith('/api/jiras/CRI%2F1', { include: 'relations' }, true);

    const service = TestBed.inject(JiraService);
    await firstValueFrom(service.metadata(true));
    expect(metadata).toHaveBeenCalledWith('/api/jiras/meta', true);
    const body = {
      jiraKey: 'CRI-1',
      summary: 'Summary',
      projectId: null,
      statusOptionId: null,
      tagOptionIds: [],
      inActiveSprint: false,
      demoRequired: false,
      appraisal: false,
    };
    await firstValueFrom(service.create(body));
    expect(create).toHaveBeenCalledWith('/api/jiras', body);
  });
});
