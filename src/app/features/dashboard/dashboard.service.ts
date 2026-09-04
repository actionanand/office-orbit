import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { DashboardResponse } from '../../shared/models/api.models';
import { tap, timeout } from 'rxjs';
import { cacheKey, DataCacheService } from '../../core/cache/data-cache.service';
@Service()
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(DataCacheService);
  get(filters: { companyId?: string; projectId?: string } = {}, refresh = false) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) if (value) params = params.set(key, value);
    return this.cache.load(
      `dashboard:${params.toString() || 'all'}`,
      () =>
        this.http.get<DashboardResponse>(environment.apiBaseUrl + '/api/dashboard', { params }).pipe(
          timeout(15000),
          tap(response => this.seedSharedData(response)),
        ),
      refresh,
    );
  }
  updatedAt(): number | null {
    return this.cache.updatedAt('dashboard:all');
  }
  private seedSharedData(response: DashboardResponse): void {
    const jiras = [
      ...response.activeJiras,
      ...response.blockedJiras,
      ...response.spilloverJiras,
      ...response.demoPendingJiras,
    ];
    for (const jira of jiras)
      if (jira.jiraKey)
        this.cache.set(cacheKey(`/api/jiras/${encodeURIComponent(jira.jiraKey)}`, { include: 'relations' }), jira);
    this.cache.set(cacheKey('/api/work-links/active', { include: 'relations' }), {
      data: response.activeWorkLinks,
      count: response.activeWorkLinks.length,
      hasMore: false,
      nextCursor: null,
    });
  }
}
