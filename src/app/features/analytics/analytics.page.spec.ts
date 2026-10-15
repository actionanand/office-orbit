import { TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';
import { HistoricalAnalyticsResponse } from '../../shared/models/api.models';
import { AnalyticsPage } from './analytics.page';
import { AnalyticsService } from './analytics.service';

const response = (from = '2026-09-16', to = '2026-10-15'): HistoricalAnalyticsResponse => ({
  schemaVersion: 1,
  generatedAt: '2026-10-15T10:00:00.000Z',
  from,
  to,
  workActivity: { count: 0, weeks: [], categories: [], types: [] },
  spillSummary: {
    distinctJiras: 0,
    jirasWithAnySpill: 0,
    totalSpillEvents: 0,
    spillPercentage: 0,
    averageSpillsPerSpilledJira: 0,
  },
  spillTrend: null,
  sprints: [],
  topSpilledJiras: [],
});

describe('AnalyticsPage', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('keeps Custom selected when applying manually edited dates and rejects invalid local ranges', async () => {
    const load = vi.fn(() => of(response()));
    TestBed.configureTestingModule({
      imports: [AnalyticsPage],
      providers: [{ provide: AnalyticsService, useValue: { load } }],
    });
    const page = TestBed.createComponent(AnalyticsPage).componentInstance;
    page.form.setValue({ from: '', to: '2026-10-15' });
    await page.load();
    expect(load).toHaveBeenCalledTimes(1);
    expect(page.error()).toBe('Choose valid From and To dates.');

    page.form.setValue({ from: '2026-09-16', to: '2026-10-15' });
    page.applyRange();
    expect(page.preset()).toBe('custom');
  });

  it('does not allow an older response to replace a newer selected range', async () => {
    const requests: Subject<HistoricalAnalyticsResponse>[] = [];
    const load = vi.fn(() => {
      const request = new Subject<HistoricalAnalyticsResponse>();
      requests.push(request);
      return request;
    });
    TestBed.configureTestingModule({
      imports: [AnalyticsPage],
      providers: [{ provide: AnalyticsService, useValue: { load } }],
    });
    const page = TestBed.createComponent(AnalyticsPage).componentInstance;
    page.rangeChanged('90');
    requests[1].next(response('2026-07-18', '2026-10-15'));
    requests[1].complete();
    requests[0].next(response('2026-09-16', '2026-10-15'));
    requests[0].complete();
    await Promise.resolve();
    expect(page.data()?.from).toBe('2026-07-18');
  });

  it('keeps a successful response visible when an explicit refresh fails', async () => {
    const retainedResponse = response();
    const load = vi
      .fn()
      .mockReturnValueOnce(of(retainedResponse))
      .mockReturnValueOnce(throwError(() => new Error('Network unavailable')));
    TestBed.configureTestingModule({
      imports: [AnalyticsPage],
      providers: [{ provide: AnalyticsService, useValue: { load } }],
    });
    const page = TestBed.createComponent(AnalyticsPage).componentInstance;
    await Promise.resolve();
    await page.load(true);
    expect(page.data()).toBe(retainedResponse);
    expect(page.error()).toBe('Historical analytics is temporarily unavailable. Please retry.');
  });

  it('displays spill trend changes as percentage points without a percent suffix', async () => {
    const load = vi.fn(() => of(response()));
    TestBed.configureTestingModule({
      imports: [AnalyticsPage],
      providers: [{ provide: AnalyticsService, useValue: { load } }],
    });
    const fixture = TestBed.createComponent(AnalyticsPage);
    await Promise.resolve();
    fixture.componentInstance.data.set({
      ...response(),
      spillTrend: {
        firstSprintRate: 37.5,
        latestSprintRate: 25,
        changePercentagePoints: -12.5,
        direction: 'improving',
      },
    });
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('↓ 12.5 percentage points');
    expect(text).not.toContain('12.5% percentage points');
  });
});
