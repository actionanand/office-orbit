import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DataCacheService } from '../../core/cache/data-cache.service';
import { HistoricalAnalyticsResponse } from '../../shared/models/api.models';
import { AnalyticsService } from './analytics.service';

const response = (from: string, to: string): HistoricalAnalyticsResponse => ({
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

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [AnalyticsService, DataCacheService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AnalyticsService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('loads Worker historical analytics by inclusive date range and caches an exact range', async () => {
    const first = firstValueFrom(service.load('2026-09-16', '2026-10-15'));
    const request = http.expectOne(`${environment.apiBaseUrl}/api/analytics?from=2026-09-16&to=2026-10-15`);
    expect(request.request.method).toBe('GET');
    request.flush(response('2026-09-16', '2026-10-15'));
    await first;
    await firstValueFrom(service.load('2026-09-16', '2026-10-15'));
    http.expectNone(`${environment.apiBaseUrl}/api/analytics?from=2026-09-16&to=2026-10-15`);
  });

  it('separates range cache entries and bypasses the selected entry on refresh', async () => {
    const first = firstValueFrom(service.load('2026-09-16', '2026-10-15'));
    http
      .expectOne(request => request.url.endsWith('/api/analytics') && request.params.get('from') === '2026-09-16')
      .flush(response('2026-09-16', '2026-10-15'));
    await first;
    const second = firstValueFrom(service.load('2026-07-18', '2026-10-15'));
    http.expectOne(request => request.params.get('from') === '2026-07-18').flush(response('2026-07-18', '2026-10-15'));
    await second;
    const refresh = firstValueFrom(service.load('2026-09-16', '2026-10-15', true));
    http.expectOne(request => request.params.get('from') === '2026-09-16').flush(response('2026-09-16', '2026-10-15'));
    await refresh;
  });
});
