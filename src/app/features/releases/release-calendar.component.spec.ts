import { TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { ReleaseItem } from '../../shared/models/api.models';
import { ReleaseCalendarComponent } from './release-calendar.component';
import { ReleaseService } from './releases.service';

const release: ReleaseItem = {
  id: 'release-id',
  createdTime: '',
  lastEditedTime: '',
  releaseItem: 'Release item',
  componentName: 'Component name',
  deploymentType: 'Backstage',
  versionNumber: '1.0.0',
  branch: 'main',
  formalAnnouncedDate: '2026-10-10',
  confirmedReleaseDate: null,
  notes: '',
  jiraIds: [],
  jiraStatuses: [],
  sprintIds: [],
  spilloverCount: 0,
};

describe('ReleaseCalendarComponent', () => {
  const api = { calendar: vi.fn(), byDate: vi.fn() };

  beforeEach(() => {
    api.calendar.mockReset().mockReturnValue(of({ dates: [] }));
    api.byDate.mockReset().mockReturnValue(of([]));
    TestBed.configureTestingModule({ providers: [{ provide: ReleaseService, useValue: api }] });
  });

  it('emits selected exact-date releases for the shared copy-release-notes workflow', () => {
    const component = TestBed.createComponent(ReleaseCalendarComponent).componentInstance;
    const copyRequested = vi.fn();
    component.copyRequested.subscribe(copyRequested);
    component.results.set([release]);
    component.selectedIds.set([release.id]);

    component.requestCopy();

    expect(copyRequested).toHaveBeenCalledWith([release]);
  });

  it('clears calendar-specific selections when a new result set is selected', () => {
    const component = TestBed.createComponent(ReleaseCalendarComponent).componentInstance;
    component.results.set([release]);
    component.selectedIds.set([release.id]);

    component.clearSelection();

    expect(component.selectedIds()).toEqual([]);
  });

  it('shows the month loader until summary data arrives and hides the grid on failure', () => {
    const component = TestBed.createComponent(ReleaseCalendarComponent).componentInstance;
    const pending = new Subject<{ dates: [] }>();
    api.calendar.mockReturnValue(pending);

    component.loadSummary();
    expect(component.loadingSummary()).toBe(true);

    pending.error(new Error('offline'));
    expect(component.loadingSummary()).toBe(false);
    expect(component.summaryError()).toContain('could not be loaded');
    expect(component.dates()).toEqual([]);
  });
});
