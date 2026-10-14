import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { API_RETRY_SAFE_MUTATION } from '../api/api-retry-policy';
import { AlterControlsService } from './alter-controls.service';

describe('AlterControlsService', () => {
  let service: AlterControlsService;
  let http: HttpTestingController;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-14T08:00:00.000Z'));
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AlterControlsService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.useRealTimers();
  });

  it('maps both controls and preserves an unexpired Active till value', async () => {
    const load = service.refresh();
    http.expectOne(environment.apiBaseUrl + '/api/settings/alter-controls').flush({
      data: state('2026-10-14T08:00:00.000Z', true, false),
    });
    await load;

    expect(service.alterSprintEnabled()).toBe(true);
    expect(service.alterReleaseManagementEnabled()).toBe(false);
    expect(service.sprintActiveUntil()).toBe('2026-10-14T08:30:00.000Z');
    expect(service.sprintRemainingSeconds()).toBe(1800);
  });

  it('uses server time for expiry and does not PATCH when the local projection expires', async () => {
    vi.setSystemTime(new Date('2026-10-14T07:50:00.000Z'));
    const load = service.refresh();
    http.expectOne(environment.apiBaseUrl + '/api/settings/alter-controls').flush({
      data: state('2026-10-14T08:00:00.000Z', true, false),
    });
    await load;
    expect(service.sprintRemainingSeconds()).toBe(1800);

    vi.advanceTimersByTime(30 * 60 * 1000);
    expect(service.alterSprintEnabled()).toBe(false);
    expect(service.sprintActiveUntil()).toBeNull();
    http.expectNone(request => request.method === 'PATCH');
  });

  it('sends exact independent enable and disable bodies without retry-safe mutation context', async () => {
    const enable = service.setControl('sprint', true);
    const enableRequest = http.expectOne(environment.apiBaseUrl + '/api/settings/alter-controls');
    expect(enableRequest.request.body).toEqual({ control: 'sprint', enabled: true });
    expect(enableRequest.request.context.get(API_RETRY_SAFE_MUTATION)).toBe(false);
    enableRequest.flush({ data: state('2026-10-14T08:00:00.000Z', true, false) });
    await enable;

    const disable = service.setControl('sprint', false);
    const disableRequest = http.expectOne(environment.apiBaseUrl + '/api/settings/alter-controls');
    expect(disableRequest.request.body).toEqual({ control: 'sprint', enabled: false });
    expect(disableRequest.request.context.get(API_RETRY_SAFE_MUTATION)).toBe(false);
    disableRequest.flush({ data: state('2026-10-14T08:01:00.000Z', false, false) });
    await disable;

    const release = service.setControl('releaseManagement', true);
    const releaseRequest = http.expectOne(environment.apiBaseUrl + '/api/settings/alter-controls');
    expect(releaseRequest.request.body).toEqual({ control: 'releaseManagement', enabled: true });
    releaseRequest.flush({ data: state('2026-10-14T08:02:00.000Z', false, true) });
    await release;
    expect(service.alterSprintEnabled()).toBe(false);
    expect(service.alterReleaseManagementEnabled()).toBe(true);
  });

  it('lets a later backend refresh override an expired local projection without persistence', async () => {
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    const first = service.refresh();
    http.expectOne(environment.apiBaseUrl + '/api/settings/alter-controls').flush({
      data: state('2026-10-14T08:00:00.000Z', false, false),
    });
    await first;
    const second = service.refresh();
    http.expectOne(environment.apiBaseUrl + '/api/settings/alter-controls').flush({
      data: state('2026-10-14T08:05:00.000Z', true, false),
    });
    await second;
    expect(service.alterSprintEnabled()).toBe(true);
    expect(storage).not.toHaveBeenCalled();
  });

  it.each([
    [false, true],
    [true, false],
  ])('waits for an older GET before reconciling (%s -> %s)', async (oldEnabled, freshEnabled) => {
    const url = environment.apiBaseUrl + '/api/settings/alter-controls';
    const oldLoad = service.refresh();
    const oldRequest = http.expectOne(url);
    const patch = service.setControl('sprint', !oldEnabled);
    const patchRequest = http.expectOne(url);
    expect(patchRequest.request.method).toBe('PATCH');
    expect(patchRequest.request.context.get(API_RETRY_SAFE_MUTATION)).toBe(false);
    patchRequest.flush({}, { status: 504, statusText: 'Gateway Timeout' });
    await patch.catch(() => undefined);

    const reconciliation = service.refreshFresh();
    http.expectNone(url);

    oldRequest.flush({ data: state('2026-10-14T08:00:00.000Z', oldEnabled, false) });
    await oldLoad;
    await Promise.resolve();
    await Promise.resolve();

    const freshRequest = http.expectOne(url);
    expect(freshRequest.request.method).toBe('GET');
    freshRequest.flush({ data: state('2026-10-14T08:01:00.000Z', freshEnabled, false) });
    await reconciliation;

    expect(service.alterSprintEnabled()).toBe(freshEnabled);
    expect(http.match(request => request.method === 'PATCH')).toHaveLength(0);
  });
});

function state(serverTime: string, sprint: boolean, release: boolean) {
  const active = (enabled: boolean) => ({
    enabled,
    activeUntil: enabled ? '2026-10-14T08:30:00.000Z' : null,
    remainingSeconds: enabled ? 1800 : 0,
  });
  return {
    alterSprint: active(sprint),
    alterReleaseManagement: active(release),
    ttlSeconds: 1800,
    serverTime,
  };
}
