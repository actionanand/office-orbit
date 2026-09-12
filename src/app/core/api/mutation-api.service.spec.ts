import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DataCacheService } from '../cache/data-cache.service';
import { MutationApiService } from './mutation-api.service';

describe('MutationApiService', () => {
  let service: MutationApiService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(MutationApiService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('caches metadata from the requested endpoint', async () => {
    const first = firstValueFrom(service.metadata('/api/work-logs/meta'));
    http.expectOne(`${environment.apiBaseUrl}/api/work-logs/meta`).flush({ resource: 'work-logs', fields: [] });
    await first;
    expect((await firstValueFrom(service.metadata('/api/work-logs/meta'))).resource).toBe('work-logs');
    http.expectNone(`${environment.apiBaseUrl}/api/work-logs/meta`);
  });

  it('uses POST and an encoded page id for PATCH', async () => {
    const created = firstValueFrom(
      service.create<{ id: string }, { update: string }>('/api/work-logs', { update: 'Done' }),
    );
    const post = http.expectOne(`${environment.apiBaseUrl}/api/work-logs`);
    expect(post.request.method).toBe('POST');
    expect(post.request.body).toEqual({ update: 'Done' });
    post.flush({ data: { id: 'new' } });
    await created;

    const patched = firstValueFrom(
      service.patch<{ id: string }, { update: string }>('/api/work-logs', 'page/id', { update: 'Updated' }),
    );
    const patch = http.expectOne(`${environment.apiBaseUrl}/api/work-logs/page%2Fid`);
    expect(patch.request.method).toBe('PATCH');
    patch.flush({ data: { id: 'page/id' } });
    await patched;
  });

  it('uses literal QUERY with the typed request body', async () => {
    const body = {
      filters: { types: ['Work', 'Support'], workModes: ['WFH'] },
      pageSize: 25,
      cursor: 'opaque',
      includeRelations: true,
    };
    const result = firstValueFrom(service.query('/api/work-logs', body));
    const request = http.expectOne(`${environment.apiBaseUrl}/api/work-logs`);
    expect(request.request.method).toBe('QUERY');
    expect(request.request.body).toEqual(body);
    request.flush({ data: [], count: 0, hasMore: false, nextCursor: null });
    await result;
  });

  it('invalidates affected resource and summary cache prefixes after a successful write', async () => {
    const cache = TestBed.inject(DataCacheService);
    cache.set('/api/work-logs?page=one', true);
    cache.set('dashboard:summary', true);
    cache.set('unrelated', true);
    const result = firstValueFrom(service.create('/api/work-logs', { update: 'Done' }));
    http.expectOne(`${environment.apiBaseUrl}/api/work-logs`).flush({ data: { id: 'new' } });
    await result;
    expect(cache.get('/api/work-logs?page=one')).toBeNull();
    expect(cache.get('dashboard:summary')).toBeNull();
    expect(cache.get('unrelated')).toBe(true);
  });
});
