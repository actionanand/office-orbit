import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { navigation } from '../../shared/navigation';
import { Sprint } from '../../shared/models/api.models';
import { environment } from '../../../environments/environment';
import { DashboardService } from '../dashboard/dashboard.service';
import { OfficeEventsPage } from './office-events.page';
import { OfficeEventsService } from './office-events.service';
import { OfficeEvent, parseEvents } from './office-event';

describe('Office Events page', () => {
  const sprint: Sprint = {
    id: 'sprint',
    sprint: 'Current',
    active: true,
    startDate: '2026-09-14',
    endDate: '2026-09-28',
    weekOff1: null,
    weekOff2: null,
    plannedLeaveDays: 0,
    holidayDays: 0,
    capacityDays: 10,
    availableDays: 10,
    allocatedDays: 0,
    remainingDays: 10,
    projectIds: [],
    allocationIds: [],
  };
  const dashboard = { get: vi.fn(() => of({ currentSprint: sprint as Sprint | null })) };
  const sheets = {
    load: vi.fn(() =>
      of({
        events: parseEvents([[{ v: 1 }, { v: 'Holiday' }, { v: '2026-09-14' }, { v: 'Monday' }]], 'holiday'),
        warnings: [],
      }),
    ),
  };
  beforeEach(() => {
    environment.showHoliday = true;
    environment.showImportantDay = true;
    environment.showRota = true;
    dashboard.get.mockReset().mockReturnValue(of({ currentSprint: sprint }));
    sheets.load.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: DashboardService, useValue: dashboard },
        { provide: OfficeEventsService, useValue: sheets },
      ],
    });
  });
  afterEach(() => {
    environment.showHoliday = true;
    environment.showImportantDay = true;
    environment.showRota = true;
  });
  it('defaults to All and filters the enabled event types from the Ionic dropdown', () => {
    const page = TestBed.runInInjectionContext(() => new OfficeEventsPage());
    const events: OfficeEvent[] = [
      {
        id: 'holiday',
        type: 'holiday',
        title: 'Holiday',
        sNo: 1,
        sourceOrder: 1,
        startDate: '2026-09-14',
        endDate: '2026-09-14',
      },
      {
        id: 'important-day',
        type: 'important-day',
        title: 'Important day',
        sNo: 2,
        sourceOrder: 2,
        startDate: '2026-09-15',
        endDate: '2026-09-15',
      },
      {
        id: 'rota',
        type: 'rota',
        title: 'Rota',
        sNo: 3,
        sourceOrder: 3,
        startDate: '2026-09-16',
        endDate: '2026-09-16',
      },
    ];
    page.events.set(events);

    expect(page.eventType()).toBe('all');
    expect(page.availableTypes()).toEqual(['holiday', 'important-day', 'rota']);
    expect(page.visibleEvents()).toHaveLength(3);

    page.changeEventType('rota');
    expect(page.visibleEvents().map(event => event.type)).toEqual(['rota']);
    page.changeEventType('holiday');
    expect(page.visibleEvents().map(event => event.type)).toEqual(['holiday']);
  });
  it('labels exact event dates relative to today without labeling date ranges', () => {
    const page = TestBed.runInInjectionContext(() => new OfficeEventsPage());
    page.today.set(new Date(2026, 8, 14));
    const event = (startDate: string, endDate = startDate): OfficeEvent => ({
      id: startDate,
      type: 'holiday',
      title: 'Holiday',
      sNo: 1,
      sourceOrder: 1,
      startDate,
      endDate,
    });

    expect(page.relativeDateLabel(event('2026-09-14'))).toBe('Today');
    expect(page.relativeDateLabel(event('2026-09-15'))).toBe('Tomorrow');
    expect(page.relativeDateLabel(event('2026-09-16'))).toBe('In 2 days');
    expect(page.relativeDateLabel(event('2026-09-18'))).toBe('In 4 days');
    expect(page.relativeDateLabel(event('2026-09-14', '2026-09-15'))).toBe('');
  });
  it('marks only completed single-day events from the current month as past', () => {
    const page = TestBed.runInInjectionContext(() => new OfficeEventsPage());
    page.today.set(new Date(2026, 8, 16));
    const event = (startDate: string, endDate = startDate): OfficeEvent => ({
      id: startDate,
      type: 'holiday',
      title: 'Holiday',
      sNo: 1,
      sourceOrder: 1,
      startDate,
      endDate,
    });

    expect(page.isPastEvent(event('2026-09-14'))).toBe(true);
    expect(page.isPastEvent(event('2026-08-31'))).toBe(false);
    expect(page.isPastEvent(event('2026-09-16'))).toBe(false);
    expect(page.isPastEvent(event('2026-09-01', '2026-09-30'))).toBe(false);
  });
  it('leaves Office Events empty and avoids loading sources when every type is disabled', () => {
    environment.showHoliday = false;
    environment.showImportantDay = false;
    environment.showRota = false;
    const page = TestBed.runInInjectionContext(() => new OfficeEventsPage());

    expect(page.availableTypes()).toEqual([]);
    expect(page.loading()).toBe(false);
    expect(sheets.load).not.toHaveBeenCalled();
    expect(dashboard.get).not.toHaveBeenCalled();
  });
  it('uses dashboard Sprint dates and refreshes both sources', () => {
    const page = TestBed.runInInjectionContext(() => new OfficeEventsPage());
    expect(page.window()).toEqual({ startDate: '2026-09-14', endDate: '2026-09-28' });
    expect(page.visibleEvents()).toHaveLength(1);
    page.load(true);
    expect(dashboard.get).toHaveBeenLastCalledWith({}, true);
    expect(sheets.load).toHaveBeenLastCalledWith(true);
    expect(page.loading()).toBe(false);
  });
  it('keeps month views available with no active Sprint, missing dates or a Sprint error', () => {
    const page = TestBed.runInInjectionContext(() => new OfficeEventsPage());
    dashboard.get.mockReturnValue(of({ currentSprint: null }));
    page.load();
    expect(page.sprint()).toBeNull();
    expect(page.window()).toBeNull();
    dashboard.get.mockReturnValue(of({ currentSprint: { ...sprint, startDate: null } }));
    page.load();
    expect(page.sprint()).not.toBeNull();
    expect(page.window()).toBeNull();
    dashboard.get.mockReturnValue(throwError(() => new Error('offline')));
    page.load();
    expect(page.sprintError()).toContain('could not be loaded');
    page.changePeriod('month');
    page.today.set(new Date(2026, 8, 14));
    expect(page.visibleEvents()).toHaveLength(1);
    page.changePeriod('next-month');
    page.today.set(new Date(2026, 11, 14));
    expect(page.window()?.startDate).toBe('2027-01-01');
  });
  it('adds a lazy protected route and More navigation without changing primary items', () => {
    const app = routes.find(route => route.path === 'app');
    expect(app?.canActivateChild?.length).toBeGreaterThan(0);
    expect(app?.children?.find(route => route.path === 'office-events')?.loadComponent).toBeDefined();
    expect(navigation.slice(0, 4).map(item => item.path)).toEqual(['dashboard', 'work-logs', 'jiras', 'sprints']);
    expect(navigation.slice(4)).toContainEqual({
      path: 'office-events',
      label: 'Office Events',
      icon: 'calendar-outline',
    });
  });
});
