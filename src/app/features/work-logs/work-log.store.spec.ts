import { TestBed } from '@angular/core/testing';
import { CursorService } from '../../core/api/cursor.service';
import { WorkLogService } from './work-logs.service';
import { WorkLogStore } from './work-log.store';
import { workLogFixture } from '../../shared/models/work-log.fixture';
describe('Calendar cache', () => {
  it('reuses a complete month when returning and refreshes only that month', async () => {
    const range = vi.fn().mockResolvedValue([workLogFixture('a')]);
    TestBed.configureTestingModule({
      providers: [
        { provide: CursorService, useValue: { range } },
        { provide: WorkLogService, useValue: {} },
      ],
    });
    const store = TestBed.inject(WorkLogStore);
    store.mode.set('calendar');
    store.month.set('2026-09');
    await store.load(false);
    store.month.set('2026-10');
    await store.load(false);
    store.month.set('2026-09');
    await store.load(false);
    expect(range).toHaveBeenCalledTimes(2);
    expect(range.mock.calls[0][1]).toEqual(expect.objectContaining({ from: '2026-09-01', to: '2026-09-30' }));
    await store.load(true);
    expect(range).toHaveBeenCalledTimes(3);
  });
});
