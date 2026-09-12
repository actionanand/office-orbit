import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { workLogFixture } from '../../shared/models/work-log.fixture';
import { WorkLogService } from './work-logs.service';
import { WorkLogStore } from './work-log.store';

describe('WorkLogStore transport', () => {
  it('uses QUERY for multi-value filters and carries the same filters into load more', async () => {
    const query = vi
      .fn()
      .mockReturnValueOnce(of({ data: [workLogFixture('a')], count: 1, hasMore: true, nextCursor: 'opaque' }))
      .mockReturnValueOnce(of({ data: [workLogFixture('b')], count: 1, hasMore: false, nextCursor: null }));
    TestBed.configureTestingModule({ providers: [{ provide: WorkLogService, useValue: { query, list: vi.fn() } }] });
    const store = TestBed.inject(WorkLogStore);
    store.filters.set({
      from: '2026-09-01',
      to: '2026-09-30',
      categories: ['Office Work'],
      types: ['Work', 'Support'],
      workModes: ['WFH'],
    });
    await store.load(false);
    await store.load(false, true);
    const expected = expect.objectContaining({
      from: '2026-09-01',
      types: ['Work', 'Support'],
      workModes: ['WFH'],
    });
    expect(query).toHaveBeenNthCalledWith(1, expected, null);
    expect(query).toHaveBeenNthCalledWith(2, expected, 'opaque');
    expect(store.items().map(item => item.id)).toEqual(['a', 'b']);
  });

  it('keeps the saved appraisal view on GET', async () => {
    const list = vi.fn().mockReturnValue(of({ data: [], count: 0, hasMore: false, nextCursor: null, lastUpdated: 1 }));
    const query = vi.fn();
    TestBed.configureTestingModule({ providers: [{ provide: WorkLogService, useValue: { query, list } }] });
    const store = TestBed.inject(WorkLogStore);
    store.selectedPath.set('/api/work-logs/appraisal');
    await store.load(false);
    expect(list).toHaveBeenCalledWith('/api/work-logs/appraisal', {}, false, false);
    expect(query).not.toHaveBeenCalled();
  });
});
