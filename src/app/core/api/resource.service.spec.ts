import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Jira } from '../../shared/models/api.models';
import { ResourceService } from './resource.service';

const jira: Jira = {
  id: 'internal-id',
  createdTime: '',
  lastEditedTime: '',
  jiraKey: 'CRI-1234',
  summary: 'Cached JIRA',
  status: 'In progress',
  tags: [],
  appraisal: false,
  spillover: false,
  spilloverCount: 0,
  spilloverReason: '',
  inActiveSprint: true,
  demoRequired: false,
  demoedDate: null,
  demoNotes: '',
  sprintIds: [],
  projectIds: [],
  blockedByIds: [],
  releaseItemIds: [],
  projects: [],
  sprints: [],
  blockedBy: [],
};

describe('ResourceService caching', () => {
  it('reuses JIRA list data for detail without another HTTP request', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(ResourceService);
    const http = TestBed.inject(HttpTestingController);
    const list = firstValueFrom(service.list<Jira>('/api/jiras/active', { include: 'relations' }));
    http
      .expectOne(request => request.url.endsWith('/api/jiras/active'))
      .flush({ data: [jira], count: 1, hasMore: false, nextCursor: null });
    await list;
    expect(await firstValueFrom(service.detail<Jira>('/api/jiras/CRI-1234', { include: 'relations' }))).toEqual(jira);
    http.expectNone(request => request.url.endsWith('/api/jiras/CRI-1234'));
    http.verify();
  });

  it('does not request continuation pages automatically', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(ResourceService);
    const http = TestBed.inject(HttpTestingController);
    const result = firstValueFrom(service.list<Jira>('/api/jiras', { include: 'relations' }));
    const request = http.expectOne(value => value.url === `${environment.apiBaseUrl}/api/jiras`);
    expect(request.request.params.has('cursor')).toBe(false);
    expect(request.request.params.get('pageSize')).toBe('25');
    request.flush({ data: [jira], count: 1, hasMore: true, nextCursor: 'opaque' });
    expect((await result).nextCursor).toBe('opaque');
    http.expectNone(value => value.params.has('cursor'));
    http.verify();
  });
});
