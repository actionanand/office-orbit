import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { WorkCalendarService } from './work-calendar.service';
import { WEEKDAYS } from './todo-recurrence';
import { environment } from '../../../environments/environment';
import { DataCacheService } from '../../core/cache/data-cache.service';

describe('WorkCalendarService', () => {
  let http: HttpTestingController, service: WorkCalendarService;
  const url = environment.apiBaseUrl + '/api/settings/work-calendar';
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(WorkCalendarService);
  });
  afterEach(() => http.verify());
  it('loads Worker values, saves canonical custom days, and accepts none', () => {
    const loaded = vi.fn();
    service.get().subscribe(loaded);
    http.expectOne(url).flush({ data: { weekOffDays: ['Friday', 'Saturday'] } });
    expect(loaded).toHaveBeenCalledWith({ weekOffDays: ['Friday', 'Saturday'] });
    service.save(['Sunday', 'Monday']).subscribe();
    const patch = http.expectOne(url);
    expect(patch.request.method).toBe('PATCH');
    expect(patch.request.body).toEqual({ weekOffDays: ['Monday', 'Sunday'] });
    patch.flush({ data: { weekOffDays: ['Monday', 'Sunday'] } });
    expect(TestBed.inject(DataCacheService).get('/api/settings/work-calendar')).toEqual({
      weekOffDays: ['Monday', 'Sunday'],
    });
    service.get().subscribe(loaded);
    http.expectNone(url);
    expect(loaded).toHaveBeenLastCalledWith({ weekOffDays: ['Monday', 'Sunday'] });
    service.save([]).subscribe();
    const empty = http.expectOne(url);
    expect(empty.request.body).toEqual({ weekOffDays: [] });
    empty.flush({ data: { weekOffDays: [] } });
  });
  it('rejects all seven without a request and propagates failures for the UI', () => {
    expect(() => service.save(WEEKDAYS)).toThrow();
    http.expectNone(url);
    const failed = vi.fn();
    service.get(true).subscribe({ error: failed });
    http.expectOne(url).flush({}, { status: 503, statusText: 'Unavailable' });
    expect(failed).toHaveBeenCalled();
  });
});
