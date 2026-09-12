import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RelationOptionsService } from './relation-options.service';

describe('RelationOptionsService', () => {
  it('follows opaque cursors and exposes useful JIRA labels', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(RelationOptionsService);
    const http = TestBed.inject(HttpTestingController);
    const result = firstValueFrom(service.load('/api/jiras'));
    const first = http.expectOne(
      request => request.url === `${environment.apiBaseUrl}/api/jiras` && !request.params.has('cursor'),
    );
    expect(first.request.params.get('pageSize')).toBe('100');
    first.flush({
      data: [{ id: 'one', jiraKey: 'LSC-1', summary: 'First task' }],
      hasMore: true,
      nextCursor: 'opaque/+cursor',
    });
    http
      .expectOne(request => request.params.get('cursor') === 'opaque/+cursor')
      .flush({ data: [{ id: 'two', jiraKey: 'LSC-2', summary: 'Second task' }], hasMore: false, nextCursor: null });
    expect(await result).toEqual([
      { id: 'one', label: 'LSC-1', description: 'First task' },
      { id: 'two', label: 'LSC-2', description: 'Second task' },
    ]);
    http.verify();
  });
});
