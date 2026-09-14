import { HttpClient } from '@angular/common/http';
import { Service, inject } from '@angular/core';
import { Observable, catchError, forkJoin, map, of, tap, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { GvizRow, parseGviz } from './gviz';
import { EVENT_LABELS, OfficeEvent, OfficeEventType, parseEvents } from './office-event';

@Service()
export class GvizService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<number, { rows: GvizRow[]; expires: number }>();
  private generation = 0;

  clear(): void {
    this.generation++;
    this.cache.clear();
  }

  rows(gid: number): Observable<GvizRow[]> {
    const cached = this.cache.get(gid);
    if (cached && cached.expires > Date.now()) return of(cached.rows);
    const generation = this.generation;
    return this.http
      .get(`https://docs.google.com/spreadsheets/d/${environment.GOOGLE_SHEET_ID}/gviz/tq`, {
        responseType: 'text',
        params: { tqx: 'out:json', gid: String(gid), headers: '1', _: String(Date.now()) },
      })
      .pipe(
        timeout(15000),
        map(parseGviz),
        tap(rows => {
          if (generation === this.generation) this.cache.set(gid, { rows, expires: Date.now() + 5 * 60_000 });
        }),
      );
  }
}

export interface OfficeEventsResult {
  events: OfficeEvent[];
  warnings: string[];
}

@Service()
export class OfficeEventsService {
  private readonly gviz = inject(GvizService);
  load(refresh = false): Observable<OfficeEventsResult> {
    if (refresh) this.gviz.clear();
    const sources: { type: OfficeEventType; gid: number }[] = [
      { type: 'holiday', gid: environment.HOLIDAY_SHEET_GID },
      { type: 'important-day', gid: environment.IMP_DAYS_SHEET_GID },
      { type: 'rota', gid: environment.ROTA_SHEET_GID },
    ];
    return forkJoin(
      sources.map(({ type, gid }) =>
        this.gviz.rows(gid).pipe(
          map(rows => ({ events: parseEvents(rows, type), warnings: [] as string[] })),
          catchError(() =>
            of({
              events: [] as OfficeEvent[],
              warnings: [`${EVENT_LABELS[type]} data could not be loaded. Refresh to try again.`],
            }),
          ),
        ),
      ),
    ).pipe(
      map(results => ({
        events: results.flatMap(result => result.events),
        warnings: results.flatMap(result => result.warnings),
      })),
    );
  }
}
