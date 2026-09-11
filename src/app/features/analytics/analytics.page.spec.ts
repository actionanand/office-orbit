import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { DashboardResponse, Sprint } from '../../shared/models/api.models';
import { DashboardService } from '../dashboard/dashboard.service';
import { AnalyticsPage } from './analytics.page';
import { AnalyticsService } from './analytics.service';

const sprint = (plannedLeaveDays: number, holidayDays: number): Sprint => ({
  id: 'sprint-id',
  sprint: 'Sprint 6',
  active: true,
  startDate: null,
  endDate: null,
  weekOff1: null,
  weekOff2: null,
  plannedLeaveDays,
  holidayDays,
  capacityDays: 10,
  availableDays: 8,
  allocatedDays: 8,
  remainingDays: 0,
  projectIds: [],
  allocationIds: [],
});

const dashboard = (currentSprint: Sprint): DashboardResponse => ({
  generatedAt: new Date().toISOString(),
  company: null,
  project: null,
  currentSprint,
  jiraSummary: { active: 0, blocked: 0, spillovers: 0, demoPending: 0 },
  activeJiras: [],
  blockedJiras: [],
  spilloverJiras: [],
  demoPendingJiras: [],
  recentWorkLogs: [],
  releaseSummary: { pending: 0, confirmed: 0, notAnnounced: 0 },
  pendingReleases: [],
  feedbackSummary: { appraisal: 0, improvementFollowUp: 0, negative: 0 },
  activeWorkLinks: [],
});

describe('AnalyticsPage Sprint health', () => {
  async function render(currentSprint: Sprint) {
    const response = dashboard(currentSprint);
    await TestBed.configureTestingModule({
      imports: [AnalyticsPage],
      providers: [
        {
          provide: AnalyticsService,
          useValue: { load: () => of({ weeks: [], categories: [], types: [], count: 0, updatedAt: Date.now() }) },
        },
        { provide: DashboardService, useValue: { get: () => of(response) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AnalyticsPage);
    fixture.componentInstance.dashboard.set(response);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('shows capacity, leave, holidays, available, allocated, and remaining in order', async () => {
    const fixture = await render(sprint(1, 1));
    expect(fixture.componentInstance.sprintDays()).toEqual([
      { label: 'Capacity', value: 10 },
      { label: 'Planned leave', value: 1 },
      { label: 'Holidays', value: 1 },
      { label: 'Available', value: 8 },
      { label: 'Allocated', value: 8 },
      { label: 'Remaining', value: 0 },
    ]);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain(
      'Capacity 10 · Available 8 · Allocated 8 · Remaining 0',
    );
  });

  it('omits zero leave and holiday rows while retaining the core capacity values', async () => {
    const fixture = await render(sprint(0, 0));
    const labels = fixture.componentInstance.sprintDays().map(item => item.label);
    expect(labels).toEqual(['Capacity', 'Available', 'Allocated', 'Remaining']);
  });
});
