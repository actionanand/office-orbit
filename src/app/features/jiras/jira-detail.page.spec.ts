import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LinksService } from '../../core/platform/links.service';
import { JiraDetail, SprintRef } from '../../shared/models/api.models';
import { JiraDetailPage } from './jira-detail.page';
import { JiraLinkService } from './jira-link.service';
import { JiraService } from './jiras.service';

const historical: SprintRef = {
  id: 'sprint-5',
  name: 'Sprint 5',
  active: false,
  startDate: '2026-08-19',
  endDate: '2026-09-01',
};
const current: SprintRef = {
  id: 'sprint-6',
  name: 'Sprint 6',
  active: true,
  startDate: '2026-09-02',
  endDate: '2026-09-15',
};
const future: SprintRef = { id: 'sprint-7', name: 'Sprint 7', active: false, startDate: null, endDate: null };

const jira: JiraDetail = {
  id: 'hidden-jira-id',
  createdTime: '',
  lastEditedTime: '',
  jiraKey: 'CRI-1234',
  summary: 'Upgrade Angular',
  status: 'Blocked',
  tags: ['Sprint Work', 'Prod Support'],
  appraisal: true,
  spillover: true,
  spilloverCount: 2,
  description: 'Move the client to the current JIRA contract.',
  firstSprintStart: '2026-08-19',
  inActiveSprint: true,
  demoRequired: true,
  demoedDate: null,
  demoNotes: 'Show migration',
  sprintIds: [historical.id, current.id, future.id],
  projectIds: ['hidden-project-id'],
  linkedJiraIds: ['hidden-linked-id'],
  linkedFromIds: ['hidden-incoming-id'],
  linkType: 'Blocks',
  linkReason: 'Historical contract migration',
  linkedOn: '2026-08-19',
  resolvedOn: null,
  releaseItemIds: ['hidden-release-id'],
  projects: [{ id: 'hidden-project-id', name: 'Cortellis Regulatory Intelligence' }],
  sprints: [current, historical, future],
  linkedJiras: [{ id: 'hidden-linked-id', key: 'CRI-1200', summary: 'Platform update' }],
  linkedFrom: [{ id: 'hidden-incoming-id', key: 'CRI-1201', summary: 'Incoming relationship' }],
  sprintHistory: [
    {
      sprint: historical,
      allocationId: 'allocation-1',
      plannedDays: 10,
      allocationNotes: '',
      spillReason: '',
      spilled: false,
      allocationConflict: false,
      allocationCount: 1,
    },
    {
      sprint: current,
      allocationId: 'allocation-2',
      plannedDays: 2.5,
      allocationNotes: '',
      spillReason: 'Dependency delay',
      spilled: true,
      allocationConflict: false,
      allocationCount: 1,
    },
    {
      sprint: future,
      allocationId: null,
      plannedDays: null,
      allocationNotes: '',
      spillReason: '',
      spilled: false,
      allocationConflict: true,
      allocationCount: 2,
    },
  ],
  spillEvents: [
    { number: 1, fromSprint: historical, toSprint: current, reason: 'Dependency delay' },
    { number: 2, fromSprint: current, toSprint: future, reason: null },
  ],
  latestSpill: { number: 2, fromSprint: current, toSprint: future, reason: null },
  relationships: [
    {
      direction: 'outgoing',
      storedType: 'Blocks',
      displayType: 'Blocks',
      otherJira: { id: 'hidden-linked-id', key: 'CRI-1200', summary: 'Platform update', status: 'Blocked' },
      reason: 'Waiting for platform changes.',
      linkedOn: '2026-08-19',
      resolvedOn: null,
    },
    {
      direction: 'incoming',
      storedType: 'Dependency for',
      displayType: 'Depends on',
      otherJira: { id: 'hidden-incoming-id', key: 'CRI-1201', summary: 'Service rollout', status: 'Done' },
      reason: '',
      linkedOn: '2026-08-20',
      resolvedOn: '2026-09-01',
    },
  ],
  spillHistoryConsistent: false,
  timeline: { startedDate: '2026-08-19', endedDate: '2026-09-29' },
  workLogs: [
    {
      id: 'log-1',
      createdTime: '',
      lastEditedTime: '',
      update: 'Upgrade Angular runtime',
      date: '2026-08-20',
      category: null,
      type: 'Development',
      workMode: 'Office',
      comment: 'Migrated the build.',
      wentWrong: '',
      appraisal: false,
      projectIds: [],
      jiraIds: [],
      companyIds: [],
      teamIds: [],
      jiraStatuses: [],
      sprintIds: [],
      spilloverCount: 0,
    },
    {
      id: 'log-2',
      createdTime: '',
      lastEditedTime: '',
      update: 'Resolved DevOps issue',
      date: '2026-09-03',
      category: null,
      type: 'Support',
      workMode: 'Remote',
      comment: '',
      wentWrong: 'Pipeline was unavailable.',
      appraisal: true,
      projectIds: [],
      jiraIds: [],
      companyIds: [],
      teamIds: [],
      jiraStatuses: [],
      sprintIds: [],
      spilloverCount: 0,
    },
  ],
  workLogCount: 9,
  releaseItems: [
    {
      id: 'release-1',
      createdTime: '',
      lastEditedTime: '',
      releaseItem: 'Frontend deployment',
      componentName: 'cortellis-frontend',
      deploymentType: 'Backstage',
      versionNumber: '0d3e3fc-101',
      branch: 'master',
      formalAnnouncedDate: '2026-09-20',
      confirmedReleaseDate: '2026-09-21',
      notes: 'Verified deployment.',
      jiraIds: [],
      jiraStatuses: [],
      sprintIds: [],
      spilloverCount: 0,
    },
    {
      id: 'release-2',
      createdTime: '',
      lastEditedTime: '',
      releaseItem: 'Report app',
      componentName: 'cortellis-nextgen-report-app',
      deploymentType: 'Spinnaker',
      versionNumber: '7b773fd-134',
      branch: 'master-cortellis-report-app',
      formalAnnouncedDate: null,
      confirmedReleaseDate: null,
      notes: '',
      jiraIds: [],
      jiraStatuses: [],
      sprintIds: [],
      spilloverCount: 0,
    },
  ],
  releaseItemCount: 3,
};

describe('JiraDetailPage', () => {
  async function render(value = jira) {
    await TestBed.configureTestingModule({
      imports: [JiraDetailPage],
      providers: [
        provideRouter([]),
        { provide: JiraService, useValue: { detail: () => of(value) } },
        { provide: JiraLinkService, useValue: { externalUrl: () => of(null) } },
        { provide: LinksService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(JiraDetailPage);
    fixture.componentRef.setInput('jiraKey', 'CRI-1234');
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders every Sprint history entry with planned days, internal links, and the active marker', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';
    expect(text).toContain('Sprint 5');
    expect(text).toContain('Sprint 6');
    expect(text).toContain('Sprint 7');
    expect(text).toContain('Planned: 10 days');
    expect(text).toContain('Planned: 2.5 days');
    expect(text).toContain('Allocation conflict');
    expect(text).toContain('2 records found');
    expect(text).not.toContain('Planned days not recorded');
    expect(element.querySelectorAll('.sprint-history-item.current')).toHaveLength(1);
    const links = [...element.querySelectorAll<HTMLAnchorElement>('.sprint-history-heading a')].map(link => link.href);
    expect(links.some(link => link.endsWith('/app/sprints/sprint-5'))).toBe(true);
    expect(links.some(link => link.endsWith('/app/sprints/sprint-6'))).toBe(true);
    expect(links.some(link => link.endsWith('/app/sprints/sprint-7'))).toBe(true);
  });

  it('uses API spill numbering and displays only the supplied event reason', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Spill #1');
    expect(text).toContain('Spill #2');
    expect(text).toContain('Dependency delay');
    expect(text).not.toContain('No reason');
    expect(text).toContain('Dependency delay');
  });

  it('renders server-authoritative relationships, JIRA description, and spill history state', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';
    expect(text).toContain('Move the client to the current JIRA contract.');
    expect(text).toContain('First Sprint Start');
    expect(text).toContain('Spill history needs review');
    expect(text).toContain('Spilled');
    expect(text).toContain('Blocks');
    expect(text).toContain('CRI-1200');
    expect(text).toContain('Waiting for platform changes.');
    expect(text).toContain('Resolved');
    expect(text).not.toContain('Blocked by');
    expect(text).not.toContain('Active');
  });

  it('renders aggregated timeline, work and release history without raw relation IDs', async () => {
    const fixture = await render();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Work started');
    expect(text).toContain('Sprint window through');
    expect(text).toContain('Work history');
    expect(text).toContain('Upgrade Angular runtime');
    expect(text).toContain('Resolved DevOps issue');
    expect(text).toContain('Release history');
    expect(text).toContain('cortellis-frontend');
    expect(text).toContain('Backstage');
    expect(text).not.toContain('hidden-jira-id');
  });

  it('finds current Sprint by active flag and never chooses the final relation', async () => {
    const fixture = await render();
    expect(fixture.componentInstance.currentSprint(jira)).toBe(current);
    expect(fixture.componentInstance.currentSprint({ ...jira, sprints: [historical, future] })).toBeNull();
  });

  it('shows a null planned-days fallback when there is no allocation conflict', async () => {
    const value: JiraDetail = {
      ...jira,
      sprintHistory: [
        {
          sprint: historical,
          allocationId: null,
          plannedDays: null,
          allocationNotes: '',
          spillReason: '',
          spilled: false,
          allocationConflict: false,
          allocationCount: 0,
        },
      ],
      spillEvents: [],
      latestSpill: null,
    };
    const fixture = await render(value);
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Planned days not recorded');
  });
});
