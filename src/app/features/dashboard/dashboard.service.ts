import { inject, Service } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { ApiItem } from '../../shared/models/api.models';
import { timeout } from 'rxjs';
@Service()
export class DashboardService {
  private readonly http = inject(HttpClient);
  get(filters: { companyId?: string; projectId?: string } = {}) {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(filters)) if (value) params = params.set(key, value);
    return this.http.get<ApiItem>(environment.apiBaseUrl + '/api/dashboard', { params }).pipe(timeout(15000));
  }
}
