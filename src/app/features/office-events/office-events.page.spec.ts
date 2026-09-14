import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { routes } from '../../app.routes';
import { navigation } from '../../shared/navigation';
import { Sprint } from '../../shared/models/api.models';
import { DashboardService } from '../dashboard/dashboard.service';
import { OfficeEventsPage } from './office-events.page';
import { OfficeEventsService } from './office-events.service';
import { parseEvents } from './office-event';

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
    dashboard.get.mockReset().mockReturnValue(of({ currentSprint: sprint }));
    sheets.load.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: DashboardService, useValue: dashboard },
        { provide: OfficeEventsService, useValue: sheets },
      ],
    });
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
