import { TestBed } from '@angular/core/testing';
import { firstValueFrom, of } from 'rxjs';
import { DataCacheService } from '../cache/data-cache.service';
import { MutationApiService } from './mutation-api.service';
import { QueryCursorService } from './query-cursor.service';

describe('QueryCursorService', () => {
  it('preserves filters, propagates the opaque cursor, and deduplicates rows', async () => {
    const query = vi
      .fn()
      .mockReturnValueOnce(of({ data: [{ id: 'one' }], count: 1, hasMore: true, nextCursor: 'opaque' }))
      .mockReturnValueOnce(of({ data: [{ id: 'one' }, { id: 'two' }], count: 2, hasMore: false, nextCursor: null }));
    TestBed.configureTestingModule({
      providers: [QueryCursorService, DataCacheService, { provide: MutationApiService, useValue: { query } }],
    });
    const service = TestBed.inject(QueryCursorService);
    const filters = { statuses: ['Done'], q: 'report' };
    await firstValueFrom(service.query('/api/todos', filters));
    const result = await firstValueFrom(service.query('/api/todos', filters, false, false, true));
    expect(query.mock.calls[1][1]).toEqual({ filters, pageSize: 25, cursor: 'opaque', includeRelations: false });
    expect(result.data.map(item => item.id)).toEqual(['one', 'two']);
  });

  it('uses a new first page when filters change', async () => {
    const query = vi.fn().mockReturnValue(of({ data: [], count: 0, hasMore: false, nextCursor: null }));
    TestBed.configureTestingModule({ providers: [{ provide: MutationApiService, useValue: { query } }] });
    const service = TestBed.inject(QueryCursorService);
    await firstValueFrom(service.query('/api/memos', { q: 'one' }));
    await firstValueFrom(service.query('/api/memos', { q: 'two' }));
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][1].cursor).toBeNull();
  });
});
