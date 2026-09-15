import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { GvizService, OfficeEventsResult, OfficeEventsService } from './office-events.service';

const payload = (values: (string | number | null)[]) =>
  'google.visualization.Query.setResponse(' +
  JSON.stringify({ status: 'ok', table: { rows: [{ c: values.map(v => ({ v })) }] } }) +
  ');';
describe('Office Events sheet requests', () => {
  let http: HttpTestingController;
  let service: OfficeEventsService;
  const gids = [environment.HOLIDAY_SHEET_GID, environment.IMP_DAYS_SHEET_GID, environment.ROTA_SHEET_GID];
  const values = [
    [1, 'Holiday', '2026-09-14', 'Monday'],
    [1, 'Important', '2026-09-14'],
    [1, 9, '2026-09-14', '', 'Support'],
  ];
  beforeEach(() => {
    environment.showHoliday = true;
    environment.showImportantDay = true;
    environment.showRota = true;
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(OfficeEventsService);
  });
  afterEach(() => {
    environment.showHoliday = true;
    environment.showImportantDay = true;
    environment.showRota = true;
    http.verify();
    vi.restoreAllMocks();
  });
  it('does not request Office Event sheets when every event type is disabled', () => {
    environment.showHoliday = false;
    environment.showImportantDay = false;
    environment.showRota = false;
    const result = vi.fn();

    service.load().subscribe(result);

    expect(result).toHaveBeenCalledWith({ events: [], warnings: [] });
    http.expectNone(() => true);
  });
  it('provides only Holidays to recurrence calculations using the existing GViz cache', () => {
    service.load().subscribe();
    gids.forEach((gid, index) =>
      http.expectOne(req => req.params.get('gid') === String(gid)).flush(payload(values[index])),
    );
    const result = vi.fn();
    service.holidayDates().subscribe(result);
    http.expectNone(() => true);
    expect(result).toHaveBeenCalledWith({ dates: ['2026-09-14'], warning: '' });
    service.holidayDates(true).subscribe(result);
    const request = http.expectOne(req => req.params.get('gid') === String(environment.HOLIDAY_SHEET_GID));
    request.flush('failed', { status: 503, statusText: 'Unavailable' });
    expect(result).toHaveBeenLastCalledWith({ dates: [], warning: expect.stringContaining('incomplete') });
  });
  it.each([0, 1, 2])('preserves the other sources when source %s fails', failed => {
    let result: OfficeEventsResult | undefined;
    service.load().subscribe(value => (result = value));
    gids.forEach((gid, index) => {
      const request = http.expectOne(req => req.params.get('gid') === String(gid));
      expect(request.request.url).toBe(`https://docs.google.com/spreadsheets/d/${environment.GOOGLE_SHEET_ID}/gviz/tq`);
      expect(request.request.params.get('tqx')).toBe('out:json');
      expect(request.request.headers.has('Authorization')).toBe(false);
      expect(request.request.withCredentials).toBe(false);
      if (index === failed) request.flush('unavailable', { status: 503, statusText: 'Unavailable' });
      else request.flush(payload(values[index]));
    });
    expect(result?.events).toHaveLength(2);
    expect(result?.warnings).toHaveLength(1);
  });
  it('caches only in memory for five minutes and refresh bypasses every sheet', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000);
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const flush = () =>
      gids.forEach((gid, index) =>
        http.expectOne(req => req.params.get('gid') === String(gid)).flush(payload(values[index])),
      );
    service.load().subscribe();
    flush();
    service.load().subscribe();
    http.expectNone(() => true);
    clock.mockReturnValue(1_300_000);
    service.load().subscribe();
    flush();
    service.load(true).subscribe();
    flush();
    expect(storage).not.toHaveBeenCalled();
  });
  it('does not let an older pending response repopulate a cleared cache', () => {
    const gviz = TestBed.inject(GvizService);
    gviz.rows(gids[0]).subscribe();
    const old = http.expectOne(() => true);
    gviz.clear();
    old.flush(payload(values[0]));
    gviz.rows(gids[0]).subscribe();
    http.expectOne(() => true).flush(payload(values[0]));
  });
});
