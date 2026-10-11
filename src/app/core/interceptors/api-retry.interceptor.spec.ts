import {
  HttpClient,
  HttpContext,
  HttpContextToken,
  HttpEventType,
  HttpHeaders,
  HttpParams,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Subscription, TimeoutError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { API_IMPORT_TIMEOUT_MS, API_REQUEST_TIMEOUT_MS, API_RETRY_SAFE_MUTATION } from '../api/api-retry-policy';
import { apiError } from '../api/api-error';
import { MutationApiService } from '../api/mutation-api.service';
import { ResourceService } from '../api/resource.service';
import { DataCacheService } from '../cache/data-cache.service';
import { apiRetryInterceptor } from './api-retry.interceptor';
import { WorkCalendarService } from '../../features/productivity/work-calendar.service';
import { ProductivityService } from '../../features/productivity/productivity.service';

describe('apiRetryInterceptor', () => {
  const url = `${environment.apiBaseUrl}/api/jiras/LSC-84944?include=relations`;
  let client: HttpClient;
  let http: HttpTestingController;
  let subscriptions: Subscription[];

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([apiRetryInterceptor])), provideHttpClientTesting()],
    });
    client = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
    subscriptions = [];
  });

  afterEach(() => {
    subscriptions.forEach(subscription => subscription.unsubscribe());
    http.verify();
    vi.useRealTimers();
    TestBed.resetTestingModule();
  });

  function get(requestUrl = url) {
    const next = vi.fn();
    const error = vi.fn();
    const subscription = client.get(requestUrl).subscribe({ next, error });
    subscriptions.push(subscription);
    return { next, error, subscription };
  }

  function fail(status = 503, requestUrl = url, headers?: Record<string, string>) {
    const request = http.expectOne(requestUrl);
    if (status === 0) request.error(new ProgressEvent('network'));
    else request.flush({ error: 'temporary' }, { status, statusText: 'Failure', headers });
    return request;
  }

  it('returns the first successful GET without scheduling another attempt', () => {
    const result = get();
    http.expectOne(url).flush({ data: 'ok' });
    expect(result.next).toHaveBeenCalledExactlyOnceWith({ data: 'ok' });
    expect(result.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    http.expectNone(url);
  });

  it('holds a network error internally and waits exactly 1500 ms before the second attempt', () => {
    const result = get();
    fail(0);
    expect(result.error).not.toHaveBeenCalled();
    expect(result.next).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1499);
    http.expectNone(url);
    vi.advanceTimersByTime(1);
    http.expectOne(url).flush({ data: 'recovered' });
    expect(result.next).toHaveBeenCalledExactlyOnceWith({ data: 'recovered' });
    expect(result.error).not.toHaveBeenCalled();
  });

  it('waits a further 3000 ms for attempt three and only emits its success', () => {
    const result = get();
    fail();
    vi.advanceTimersByTime(1500);
    fail();
    expect(result.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2999);
    http.expectNone(url);
    vi.advanceTimersByTime(1);
    http.expectOne(url).flush({ data: 'third' });
    expect(result.next).toHaveBeenCalledExactlyOnceWith({ data: 'third' });
    expect(result.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    http.expectNone(url);
  });

  it('emits the final error once, only after all three attempts fail', () => {
    const result = get();
    fail();
    expect(result.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    fail();
    expect(result.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    fail(502);
    expect(result.error).toHaveBeenCalledTimes(1);
    expect(result.error.mock.calls[0][0].status).toBe(502);
    expect(result.next).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    http.expectNone(url);
  });

  it.each([0, 408, 425, 429, 500, 502, 503, 504])('retries transient status %s', status => {
    const result = get();
    fail(status);
    expect(result.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    http.expectOne(url).flush({});
    expect(result.next).toHaveBeenCalledTimes(1);
  });

  it.each([400, 401, 403, 404, 405, 409, 413, 415, 422, 501, 505])('immediately propagates status %s', status => {
    const result = get();
    fail(status);
    expect(result.error).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    http.expectNone(url);
  });

  it.each(['QUERY', 'PATCH'])('preserves the entire %s request across retries', method => {
    const body = { reasonMarkdown: 'Blocked by **DevOps**', filters: { q: 'test' } };
    const marker = new HttpContextToken<string>(() => 'default');
    const context = new HttpContext().set(marker, 'original').set(API_RETRY_SAFE_MUTATION, method === 'PATCH');
    const headers = new HttpHeaders({ 'X-Test': 'unchanged' });
    const params = new HttpParams().set('pageSize', 20);
    const next = vi.fn();
    const error = vi.fn();
    subscriptions.push(client.request(method, url, { body, context, headers, params }).subscribe({ next, error }));
    for (let attempt = 0; attempt < 3; attempt++) {
      const request = http.expectOne(`${url}&pageSize=20`);
      expect(request.request.method).toBe(method);
      expect(request.request.body).toBe(body);
      expect(request.request.context).toBe(context);
      expect(request.request.context.get(marker)).toBe('original');
      expect(request.request.headers.get('X-Test')).toBe('unchanged');
      expect(request.request.params).toBe(params);
      if (attempt === 2) request.flush({ data: 'ok' });
      else {
        request.flush({}, { status: 503, statusText: 'Unavailable' });
        expect(error).not.toHaveBeenCalled();
        vi.advanceTimersByTime(attempt === 0 ? 1500 : 3000);
      }
    }
    expect(next).toHaveBeenCalledExactlyOnceWith({ data: 'ok' });
  });

  it.each(['PATCH', 'POST', 'DELETE'])(
    'does not retry an unmarked %s even if mutation opt-in is set on unsafe methods',
    method => {
      const error = vi.fn();
      const context = new HttpContext().set(API_RETRY_SAFE_MUTATION, method !== 'PATCH');
      subscriptions.push(client.request(method, url, { body: { value: 'same' }, context }).subscribe({ error }));
      fail();
      expect(error).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(60_000);
      http.expectNone(url);
    },
  );

  it.each([
    'https://example.com/api/jiras',
    'https://docs.google.com/spreadsheets/d/test/gviz/tq',
    `${environment.apiBaseUrl}.example.com/api/jiras`,
    `${environment.apiBaseUrl}/other/api/jiras`,
    `${environment.apiBaseUrl}/api`,
    ...['login', 'renew', 'logout', 'sessions', 'sessions/device', 'sessions/logout-others', 'status'].map(
      path => `${environment.apiBaseUrl}/api/auth/${path}`,
    ),
  ])('leaves excluded URL %s untouched', requestUrl => {
    const result = get(requestUrl);
    vi.advanceTimersByTime(60_000);
    expect(result.error).not.toHaveBeenCalled();
    fail(503, requestUrl);
    expect(result.error).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    http.expectNone(requestUrl);
  });

  it('gives each attempt a fresh timeout budget and cancels the timed-out request', () => {
    const result = get();
    const first = http.expectOne(url);
    vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS);
    expect(first.cancelled).toBe(true);
    expect(result.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    const second = http.expectOne(url);
    vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS - 1);
    expect(second.cancelled).toBe(false);
    second.flush({ data: 'ok' });
    expect(result.next).toHaveBeenCalledExactlyOnceWith({ data: 'ok' });
    expect(result.error).not.toHaveBeenCalled();
  });

  it('only exposes TimeoutError after the third attempt times out', () => {
    const result = get();
    for (let attempt = 0; attempt < 3; attempt++) {
      const request = http.expectOne(url);
      vi.advanceTimersByTime(API_REQUEST_TIMEOUT_MS);
      expect(request.cancelled).toBe(true);
      if (attempt < 2) {
        expect(result.error).not.toHaveBeenCalled();
        vi.advanceTimersByTime(attempt === 0 ? 1500 : 3000);
      }
    }
    expect(result.error).toHaveBeenCalledTimes(1);
    const error: unknown = result.error.mock.calls[0][0];
    expect(error).toBeInstanceOf(TimeoutError);
    expect(apiError(error)).toBe('The request took too long. Check your connection and try again.');
    vi.advanceTimersByTime(60_000);
    http.expectNone(url);
  });

  it('does not extend an attempt deadline when progress events arrive', () => {
    const result = get();
    const request = http.expectOne(url);
    vi.advanceTimersByTime(10_000);
    request.event({ type: HttpEventType.DownloadProgress, loaded: 10, total: 100 });
    vi.advanceTimersByTime(5000);
    expect(request.cancelled).toBe(true);
    expect(result.error).not.toHaveBeenCalled();
    result.subscription.unsubscribe();
  });

  it('retains the longer single-attempt import budget', () => {
    const importUrl = `${environment.apiBaseUrl}/api/reference-library/import`;
    const error = vi.fn();
    subscriptions.push(client.post(importUrl, {}, { timeout: API_IMPORT_TIMEOUT_MS }).subscribe({ error }));
    const request = http.expectOne(importUrl);
    vi.advanceTimersByTime(API_IMPORT_TIMEOUT_MS - 1);
    expect(request.cancelled).toBe(false);
    vi.advanceTimersByTime(1);
    expect(request.cancelled).toBe(true);
    expect(error).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    http.expectNone(importUrl);
  });

  it.each([503, 0])(
    'keeps the actual Markdown import POST single-attempt on status %s with its 60-second budget',
    status => {
      const importUrl = `${environment.apiBaseUrl}/api/reference-library/import`;
      const error = vi.fn();
      subscriptions.push(
        TestBed.inject(ProductivityService)
          .importMarkdown(new File(['# Notes'], 'notes.md'))
          .subscribe({ error }),
      );
      const request = http.expectOne(importUrl);
      expect(request.request.method).toBe('POST');
      expect(request.request.timeout).toBe(API_IMPORT_TIMEOUT_MS);
      expect(request.request.context.get(API_RETRY_SAFE_MUTATION)).toBe(false);
      vi.advanceTimersByTime(API_IMPORT_TIMEOUT_MS - 1);
      expect(request.cancelled).toBe(false);
      expect(error).not.toHaveBeenCalled();
      if (status === 0) request.error(new ProgressEvent('network'));
      else request.flush({}, { status, statusText: 'Unavailable' });
      expect(error).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(60_000);
      http.expectNone(importUrl);
    },
  );

  it.each([
    ['https://docs.google.com/spreadsheets/d/test/gviz/tq', 503],
    ['https://docs.google.com/spreadsheets/d/test/gviz/tq', 0],
    ['https://sheets.googleapis.com/v4/spreadsheets/test', 503],
    ['https://sheets.googleapis.com/v4/spreadsheets/test', 0],
    ['https://example.com/api/jiras', 503],
    ['https://example.com/api/jiras', 0],
  ] as const)('excludes external request %s with status %s from both deadline and retries', (requestUrl, status) => {
    const result = get(requestUrl);
    vi.advanceTimersByTime(60_000);
    expect(result.error).not.toHaveBeenCalled();
    const request = fail(status, requestUrl);
    expect(request.cancelled).toBe(true);
    expect(result.error).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(60_000);
    http.expectNone(requestUrl);
  });

  it('retries Work Calendar saves silently and invalidates its cache once on eventual success', () => {
    const cache = TestBed.inject(DataCacheService);
    const path = '/api/settings/work-calendar';
    const requestUrl = environment.apiBaseUrl + path;
    cache.set(path, { weekOffDays: ['Sunday'] });
    const invalidate = vi.spyOn(cache, 'invalidate');
    const next = vi.fn();
    const error = vi.fn();
    subscriptions.push(TestBed.inject(WorkCalendarService).save(['Sunday', 'Saturday']).subscribe({ next, error }));
    const first = http.expectOne(requestUrl);
    expect(first.request.context.get(API_RETRY_SAFE_MUTATION)).toBe(true);
    const body: unknown = first.request.body;
    expect(body).toEqual({ weekOffDays: ['Saturday', 'Sunday'] });
    first.flush({}, { status: 503, statusText: 'Unavailable' });
    expect(invalidate).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    const second = fail(503, requestUrl);
    expect(second.request.body).toBe(body);
    expect(invalidate).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    const third = http.expectOne(requestUrl);
    expect(third.request.body).toBe(body);
    third.flush({ data: { weekOffDays: ['Saturday', 'Sunday'] } });
    expect(next).toHaveBeenCalledExactlyOnceWith({ weekOffDays: ['Saturday', 'Sunday'] });
    expect(error).not.toHaveBeenCalled();
    expect(invalidate.mock.calls.filter(([prefix]) => prefix === path)).toHaveLength(1);
    expect(cache.get(path)).toEqual({ weekOffDays: ['Saturday', 'Sunday'] });
  });

  it('leaves Work Calendar caches intact when all three save attempts fail', () => {
    const cache = TestBed.inject(DataCacheService);
    const path = '/api/settings/work-calendar';
    const requestUrl = environment.apiBaseUrl + path;
    cache.set(path, { weekOffDays: ['Sunday'] });
    const invalidate = vi.spyOn(cache, 'invalidate');
    const error = vi.fn();
    subscriptions.push(TestBed.inject(WorkCalendarService).save(['Saturday']).subscribe({ error }));
    fail(503, requestUrl);
    expect(error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    fail(503, requestUrl);
    expect(error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    fail(503, requestUrl);
    expect(error).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    expect(cache.get(path)).toEqual({ weekOffDays: ['Sunday'] });
  });

  it.each([
    ['5', 5000],
    ['999999', 30000],
    ['invalid', 1500],
    ['-1', 1500],
  ] as const)('handles Retry-After %s with a bounded delay of %s ms', (header, delay) => {
    const result = get();
    fail(429, url, { 'Retry-After': header });
    vi.advanceTimersByTime(delay - 1);
    http.expectNone(url);
    vi.advanceTimersByTime(1);
    http.expectOne(url).flush({});
    expect(result.error).not.toHaveBeenCalled();
  });

  it('falls back to the configured retry delays for a past Retry-After date', () => {
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'));
    get();
    fail(429, url, { 'Retry-After': 'Mon, 12 Oct 2026 09:00:00 GMT' });
    vi.advanceTimersByTime(1499);
    http.expectNone(url);
    vi.advanceTimersByTime(1);
    fail(429, url, { 'Retry-After': 'Mon, 12 Oct 2026 09:00:00 GMT' });
    vi.advanceTimersByTime(2999);
    http.expectNone(url);
    vi.advanceTimersByTime(1);
    http.expectOne(url).flush({});
  });

  it('honors an HTTP-date Retry-After', () => {
    vi.setSystemTime(new Date('2026-10-12T10:00:00Z'));
    get();
    fail(429, url, { 'Retry-After': 'Mon, 12 Oct 2026 10:00:04 GMT' });
    vi.advanceTimersByTime(3999);
    http.expectNone(url);
    vi.advanceTimersByTime(1);
    http.expectOne(url).flush({});
  });

  it('cancels retry timers when the caller unsubscribes', () => {
    const result = get();
    fail();
    result.subscription.unsubscribe();
    vi.advanceTimersByTime(60_000);
    http.expectNone(url);
    expect(result.error).not.toHaveBeenCalled();
  });

  it('cancels an active attempt and its timeout when the caller unsubscribes', () => {
    const result = get();
    const request = http.expectOne(url);
    result.subscription.unsubscribe();
    expect(request.cancelled).toBe(true);
    vi.advanceTimersByTime(60_000);
    http.expectNone(url);
    expect(result.error).not.toHaveBeenCalled();
  });

  it('deduplicates the logical cached read through retries and caches only success', () => {
    const resource = TestBed.inject(ResourceService);
    const cache = TestBed.inject(DataCacheService);
    const path = '/api/jiras/cache-test';
    const requestUrl = environment.apiBaseUrl + path;
    const first = { next: vi.fn(), error: vi.fn() };
    const second = { next: vi.fn(), error: vi.fn() };
    subscriptions.push(resource.detail(path).subscribe(first), resource.detail(path).subscribe(second));
    fail(503, requestUrl);
    expect(cache.get(path)).toBeNull();
    expect(first.error).not.toHaveBeenCalled();
    expect(second.error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    http.expectOne(requestUrl).flush({ id: 'same' });
    expect(first.next).toHaveBeenCalledExactlyOnceWith({ id: 'same' });
    expect(second.next).toHaveBeenCalledExactlyOnceWith({ id: 'same' });
    expect(cache.get(path)).toEqual({ id: 'same' });
    subscriptions.push(resource.detail(path).subscribe());
    http.expectNone(requestUrl);
  });

  it('does not cache a failed logical read and allows a new call after final failure', () => {
    const resource = TestBed.inject(ResourceService);
    const cache = TestBed.inject(DataCacheService);
    const path = '/api/jiras/cache-test';
    const requestUrl = environment.apiBaseUrl + path;
    const error = vi.fn();
    subscriptions.push(resource.detail(path).subscribe({ error }));
    fail(503, requestUrl);
    vi.advanceTimersByTime(1500);
    fail(503, requestUrl);
    vi.advanceTimersByTime(3000);
    fail(503, requestUrl);
    expect(error).toHaveBeenCalledTimes(1);
    expect(cache.get(path)).toBeNull();
    subscriptions.push(resource.detail(path).subscribe());
    http.expectOne(requestUrl).flush({});
  });

  it('invalidates mutation caches only once after the logical PATCH succeeds', () => {
    const service = TestBed.inject(MutationApiService);
    const cache = TestBed.inject(DataCacheService);
    const invalidate = vi.spyOn(cache, 'invalidate');
    const error = vi.fn();
    const next = vi.fn();
    const path = '/api/jiras/LSC-84944/spills/2/reason';
    const requestUrl = environment.apiBaseUrl + path;
    const body = { reasonMarkdown: 'Blocked by **DevOps**' };
    subscriptions.push(service.patchEndpoint(path, body, '/api/jiras').subscribe({ next, error }));
    fail(503, requestUrl);
    expect(invalidate).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1500);
    fail(0, requestUrl);
    expect(invalidate).not.toHaveBeenCalled();
    expect(error).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3000);
    const third = http.expectOne(requestUrl);
    expect(third.request.body).toBe(body);
    third.flush({ data: { jiraKey: 'LSC-84944' } });
    expect(next).toHaveBeenCalledTimes(1);
    expect(invalidate.mock.calls.filter(([prefix]) => prefix === '/api/jiras')).toHaveLength(1);
  });

  it('immediately propagates a spill allocation conflict without invalidation', () => {
    const error = vi.fn();
    const invalidate = vi.spyOn(TestBed.inject(DataCacheService), 'invalidate');
    const path = '/api/jiras/LSC-84944/spills/2/reason';
    subscriptions.push(
      TestBed.inject(MutationApiService).patchEndpoint(path, { reasonMarkdown: '' }, '/api/jiras').subscribe({ error }),
    );
    http
      .expectOne(environment.apiBaseUrl + path)
      .flush({ code: 'SPILL_ALLOCATION_CONFLICT' }, { status: 409, statusText: 'Conflict' });
    expect(error).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    http.expectNone(environment.apiBaseUrl + path);
  });

  it('keeps create single-attempt and does not invalidate caches on its failure', () => {
    const error = vi.fn();
    const invalidate = vi.spyOn(TestBed.inject(DataCacheService), 'invalidate');
    subscriptions.push(
      TestBed.inject(MutationApiService).create('/api/jiras', { summary: 'New' }).subscribe({ error }),
    );
    const requestUrl = environment.apiBaseUrl + '/api/jiras';
    fail(503, requestUrl);
    expect(error).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
    vi.advanceTimersByTime(60_000);
    http.expectNone(requestUrl);
  });

  it('never invalidates caches when all PATCH attempts fail', () => {
    const error = vi.fn();
    const invalidate = vi.spyOn(TestBed.inject(DataCacheService), 'invalidate');
    const path = '/api/jiras/key/spills/2/reason';
    const requestUrl = environment.apiBaseUrl + path;
    subscriptions.push(
      TestBed.inject(MutationApiService).patchEndpoint(path, { reasonMarkdown: 'same' }).subscribe({ error }),
    );
    fail(503, requestUrl);
    vi.advanceTimersByTime(1500);
    fail(503, requestUrl);
    vi.advanceTimersByTime(3000);
    fail(503, requestUrl);
    expect(error).toHaveBeenCalledTimes(1);
    expect(invalidate).not.toHaveBeenCalled();
  });
});
