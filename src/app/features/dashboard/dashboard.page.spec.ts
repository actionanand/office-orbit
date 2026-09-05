import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { DashboardResponse, Jira } from '../../shared/models/api.models';
import { DashboardPage } from './dashboard.page';
import { DashboardService } from './dashboard.service';

const jira: Jira = {
  id: '3cc87ffa-internal-id',
  createdTime: '2026-09-01T00:00:00.000Z',
  lastEditedTime: '2026-09-02T00:00:00.000Z',
  jiraKey: 'CRI-1234',
  summary: 'Upgrade Angular',
  status: 'Blocked',
  tags: ['Sprint Work', 'Prod Support'],
  appraisal: false,
  spillover: true,
  spilloverCount: 1,
  spilloverReason: '',
  inActiveSprint: true,
  demoRequired: true,
  demoedDate: null,
  demoNotes: '',
  sprintIds: ['hidden-sprint-id'],
  projectIds: [],
  blockedByIds: [],
  releaseItemIds: [],
  sprints: [{ id: 'hidden-sprint-id', name: 'Sprint 25.17' }],
};

const response: DashboardResponse = {
  generatedAt: new Date().toISOString(),
  company: null,
  project: null,
  currentSprint: {
    id: 'hidden-current-sprint-id',
    sprint: 'Sprint 25.17',
    active: true,
    startDate: '2026-08-28',
    endDate: '2026-09-10',
    weekOff1: null,
    weekOff2: null,
    plannedLeaveDays: 0,
    holidayDays: 0,
    capacityDays: 10,
    availableDays: 10,
    allocatedDays: 2,
    remainingDays: 8,
    projectIds: ['hidden-project-id'],
    allocationIds: ['hidden-allocation-id'],
  },
  jiraSummary: { active: 4, blocked: 1, spillovers: 1, demoPending: 1 },
  activeJiras: [jira],
  blockedJiras: [jira],
  spilloverJiras: [jira],
  demoPendingJiras: [jira],
  recentWorkLogs: [],
  releaseSummary: { pending: 1, confirmed: 2, notAnnounced: 0 },
  pendingReleases: [],
  feedbackSummary: { appraisal: 1, improvementFollowUp: 0, negative: 0 },
  activeWorkLinks: [],
};

describe('DashboardPage', () => {
  it('renders summaries and deduplicated attention without internal IDs', async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [provideRouter([]), { provide: DashboardService, useValue: { get: () => of(response) } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Active JIRAs');
    expect(text).toContain('2 of 10 days allocated');
    expect(text.match(/CRI-1234/g)?.length).toBe(1);
    expect(text).not.toContain('hidden-project-id');
    expect(text).not.toContain('3cc87ffa-internal-id');
    expect(text).not.toContain('Generated At');
  });
});
