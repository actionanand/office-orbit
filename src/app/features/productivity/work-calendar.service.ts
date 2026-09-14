import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { map, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DataCacheService } from '../../core/cache/data-cache.service';
import { Weekday, WorkCalendarSettings } from '../../shared/models/api.models';
import { WEEKDAYS } from './todo-recurrence';

export function validWeekOffDays(days: unknown): days is Weekday[] {
  return Array.isArray(days) && days.every(day => WEEKDAYS.includes(day)) && new Set(days).size < 7;
}
@Service()
export class WorkCalendarService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(DataCacheService);
  private readonly path = '/api/settings/work-calendar';
  get(refresh = false) {
    return this.cache.load(
      this.path,
      () =>
        this.http.get<{ data: WorkCalendarSettings }>(environment.apiBaseUrl + this.path).pipe(
          timeout(15000),
          map(response => this.checked(response.data)),
        ),
      refresh,
    );
  }
  save(weekOffDays: Weekday[]) {
    const body = this.checked({ weekOffDays });
    return this.http.patch<{ data: WorkCalendarSettings }>(environment.apiBaseUrl + this.path, body).pipe(
      timeout(15000),
      map(response => this.checked(response.data)),
      tap(settings => {
        this.cache.invalidate(this.path);
        this.cache.set(this.path, settings);
      }),
    );
  }
  private checked(settings: WorkCalendarSettings): WorkCalendarSettings {
    if (!settings || !validWeekOffDays(settings.weekOffDays))
      throw new Error('Choose fewer than seven valid week-off days.');
    return { weekOffDays: WEEKDAYS.filter(day => settings.weekOffDays.includes(day)) };
  }
}
