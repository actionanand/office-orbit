import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { DataCacheService } from '../../core/cache/data-cache.service';
import { ReleaseItem } from '../../shared/models/api.models';
import { ReleaseService } from './releases.service';

const release = (id: string): ReleaseItem => ({
  id,
  createdTime: '',
  lastEditedTime: '',
  releaseItem: `Release ${id}`,
  componentName: `Component ${id}`,
  deploymentType: 'Backstage',
  versionNumber: '1',
  branch: '',
  formalAnnouncedDate: null,
  confirmedReleaseDate: null,
  notes: '',
  jiraIds: [],
  jiraStatuses: [],
  sprintIds: [],
  spilloverCount: 0,
});

describe('ReleaseService', () => {
  let service: ReleaseService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(ReleaseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sends bulk date updates to the collection endpoint and invalidates release calendar data', async () => {
    const cache = TestBed.inject(DataCacheService);
    cache.set('/api/releases/calendar?dateType=announcement', true);
    cache.set('dashboard:summary', true);
    const saved = firstValueFrom(service.bulkSetDate(['one', 'two'], 'announcement', '2026-10-10'));
    const request = http.expectOne(`${environment.apiBaseUrl}/api/releases/bulk-date`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({
      releaseItemIds: ['one', 'two'],
      dateType: 'announcement',
      date: '2026-10-10',
    });
    request.flush({
      dateType: 'announcement',
      date: '2026-10-10',
      requested: 2,
      updated: 2,
      allSucceeded: true,
      data: [release('one'), release('two')],
    });
    expect((await saved).updated).toBe(2);
    expect(cache.get('/api/releases/calendar?dateType=announcement')).toBeNull();
    expect(cache.get('dashboard:summary')).toBeNull();
  });

  it('loads every by-date cursor once and de-duplicates relation-rich releases', async () => {
    const result = firstValueFrom(service.byDate('release', '2026-10-10'));
    const first = http.expectOne(request => request.url === `${environment.apiBaseUrl}/api/releases/by-date`);
    expect(first.request.params.get('dateType')).toBe('release');
    expect(first.request.params.get('date')).toBe('2026-10-10');
    expect(first.request.params.get('pageSize')).toBe('100');
    expect(first.request.params.get('include')).toBe('relations');
    first.flush({ data: [release('one')], count: 1, hasMore: true, nextCursor: 'next' });
    const second = http.expectOne(request => request.url === `${environment.apiBaseUrl}/api/releases/by-date`);
    expect(second.request.params.get('cursor')).toBe('next');
    second.flush({ data: [release('one'), release('two')], count: 2, hasMore: false, nextCursor: null });
    expect((await result).map(item => item.id)).toEqual(['one', 'two']);
  });

  it('requests independently cached announcement and release month summaries', async () => {
    const announcement = firstValueFrom(service.calendar('announcement', '2026-10-01', '2026-10-31'));
    const announcementRequest = http.expectOne(
      request => request.url === `${environment.apiBaseUrl}/api/releases/calendar`,
    );
    expect(announcementRequest.request.params.get('dateType')).toBe('announcement');
    expect(announcementRequest.request.params.get('from')).toBe('2026-10-01');
    expect(announcementRequest.request.params.get('to')).toBe('2026-10-31');
    announcementRequest.flush({
      dateType: 'announcement',
      from: '2026-10-01',
      to: '2026-10-31',
      totalItems: 1,
      dates: [],
    });
    await announcement;

    const releaseSummary = firstValueFrom(service.calendar('release', '2026-10-01', '2026-10-31'));
    const releaseRequest = http.expectOne(request => request.url === `${environment.apiBaseUrl}/api/releases/calendar`);
    expect(releaseRequest.request.params.get('dateType')).toBe('release');
    releaseRequest.flush({ dateType: 'release', from: '2026-10-01', to: '2026-10-31', totalItems: 0, dates: [] });
    await releaseSummary;
  });

  it('rejects a repeated exact-date cursor instead of silently dropping pages', async () => {
    const result = firstValueFrom(service.byDate('announcement', '2026-10-10'));
    http
      .expectOne(request => request.url === `${environment.apiBaseUrl}/api/releases/by-date`)
      .flush({ data: [release('one')], count: 1, hasMore: true, nextCursor: 'repeat' });
    http
      .expectOne(request => request.url === `${environment.apiBaseUrl}/api/releases/by-date`)
      .flush({ data: [release('two')], count: 1, hasMore: true, nextCursor: 'repeat' });
    await expect(result).rejects.toThrow('repeated cursor');
  });
});
