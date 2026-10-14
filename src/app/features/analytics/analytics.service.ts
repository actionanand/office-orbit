import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { environment } from '../../../environments/environment';
import { DataCacheService, cacheKey } from '../../core/cache/data-cache.service';
import { HistoricalAnalyticsResponse } from '../../shared/models/api.models';

@Service()
export class AnalyticsService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(DataCacheService);

  load(from: string, to: string, refresh = false) {
    const key = `analytics:historical:${cacheKey('/api/analytics', { from, to })}`;
    return this.cache.load(
      key,
      () =>
        this.http.get<HistoricalAnalyticsResponse>(`${environment.apiBaseUrl}/api/analytics`, {
          params: new HttpParams({ fromObject: { from, to } }),
        }),
      refresh,
    );
  }
}
