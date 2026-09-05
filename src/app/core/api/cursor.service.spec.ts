import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, of } from 'rxjs';
import { CursorService } from './cursor.service';
import { ResourceService } from './resource.service';
import { WorkLog } from '../../shared/models/api.models';
import { workLogFixture } from '../../shared/models/work-log.fixture';
describe('CursorService', () => {
  it('retains appended pages on back navigation and resets cursors for refresh and filters', async () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(CursorService);
    const http = TestBed.inject(HttpTestingController);
    const first = firstValueFrom(service.query<WorkLog>('/api/work-logs', { category: 'Office Work' }));
    const initial = http.expectOne(request => request.url.endsWith('/api/work-logs'));
    expect(initial.request.params.get('pageSize')).toBe('25');
    expect(initial.request.params.has('cursor')).toBe(false);
    initial.flush({ data: [workLogFixture('a')], count: 1, hasMore: true, nextCursor: 'opaque/+=token' });
    await first;
    const more = firstValueFrom(service.query<WorkLog>('/api/work-logs', { category: 'Office Work' }, false, true));
    const request = http.expectOne(value => value.params.get('cursor') === 'opaque/+=token');
    expect(request.request.params.get('category')).toBe('Office Work');
    request.flush({ data: [workLogFixture('b')], count: 1, hasMore: false, nextCursor: null });
    expect((await more).data.map(row => row.id)).toEqual(['a', 'b']);
    const back = await firstValueFrom(service.query<WorkLog>('/api/work-logs', { category: 'Office Work' }));
    expect(back.data).toHaveLength(2);
    expect(back.hasMore).toBe(false);
    http.expectNone(() => true);
    for (const [category, refresh] of [
      ['Office Work', true],
      ['Grooming', false],
    ] as const) {
      const reload = firstValueFrom(service.query<WorkLog>('/api/work-logs', { category }, refresh));
      const reset = http.expectOne(value => value.params.get('category') === category);
      expect(reset.request.params.has('cursor')).toBe(false);
      reset.flush({ data: [], count: 0, hasMore: false, nextCursor: null });
      await reload;
    }
    http.verify();
  });
  it('follows every cursor only within the bounded month with pageSize 100', async () => {
    const uncachedList = vi
      .fn()
      .mockReturnValueOnce(of({ data: [workLogFixture('a')], hasMore: true, nextCursor: 'next', count: 1 }))
      .mockReturnValueOnce(of({ data: [workLogFixture('b')], hasMore: false, nextCursor: null, count: 1 }));
    TestBed.configureTestingModule({ providers: [{ provide: ResourceService, useValue: { uncachedList } }] });
    const rows = await TestBed.inject(CursorService).range<WorkLog>('/api/work-logs', {
      from: '2026-09-01',
      to: '2026-09-30',
    });
    expect(rows).toHaveLength(2);
    expect(uncachedList.mock.calls[0][1]).toEqual({ from: '2026-09-01', to: '2026-09-30', pageSize: '100' });
    expect(uncachedList.mock.calls[1][1]).toEqual({
      from: '2026-09-01',
      to: '2026-09-30',
      pageSize: '100',
      cursor: 'next',
    });
  });
});
