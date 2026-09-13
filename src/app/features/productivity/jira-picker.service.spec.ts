import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { JiraPickerService } from './jira-picker.service';

describe('JiraPickerService', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('queries the current Sprint with a lightweight one-page QUERY request', () => {
    const query = vi.fn(() => of({ data: [], count: 0, hasMore: false, nextCursor: null }));
    TestBed.configureTestingModule({
      providers: [JiraPickerService, { provide: MutationApiService, useValue: { query } }],
    });
    TestBed.inject(JiraPickerService).query().subscribe();
    expect(query).toHaveBeenCalledWith('/api/jiras/options', {
      filters: {},
      pageSize: 20,
      cursor: null,
      includeRelations: false,
    });
  });

  it('trims global search and carries its opaque cursor without relation enrichment', () => {
    const query = vi.fn(() => of({ data: [], count: 0, hasMore: false, nextCursor: null }));
    TestBed.configureTestingModule({
      providers: [JiraPickerService, { provide: MutationApiService, useValue: { query } }],
    });
    TestBed.inject(JiraPickerService).query('  DEVOPS  ', 'opaque-next').subscribe();
    expect(query).toHaveBeenCalledWith('/api/jiras/options', {
      filters: { q: 'DEVOPS' },
      pageSize: 20,
      cursor: 'opaque-next',
      includeRelations: false,
    });
  });

  it('uses the literal HTTP QUERY method through MutationApiService', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    TestBed.inject(JiraPickerService).query('LSC').subscribe();
    const request = TestBed.inject(HttpTestingController).expectOne(`${environment.apiBaseUrl}/api/jiras/options`);
    expect(request.request.method).toBe('QUERY');
    expect(request.request.body).toEqual({
      filters: { q: 'LSC' },
      pageSize: 20,
      cursor: null,
      includeRelations: false,
    });
    request.flush({ data: [], count: 0, hasMore: false, nextCursor: null });
  });
});
