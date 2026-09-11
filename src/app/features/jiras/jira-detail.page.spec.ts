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
  spilloverReason: 'Legacy duplicate reason',
  inActiveSprint: true,
  demoRequired: true,
  demoedDate: null,
  demoNotes: 'Show migration',
  sprintIds: [historical.id, current.id, future.id],
  projectIds: ['hidden-project-id'],
  blockedByIds: ['hidden-blocker-id'],
  releaseItemIds: ['hidden-release-id'],
  projects: [{ id: 'hidden-project-id', name: 'Cortellis Regulatory Intelligence' }],
  sprints: [current, historical, future],
  blockedBy: [{ id: 'hidden-blocker-id', key: 'CRI-1200', summary: 'Platform update' }],
  sprintHistory: [
    {
      sprint: historical,
      allocationId: 'allocation-1',
      plannedDays: 10,
      allocationNotes: '',
      allocationConflict: false,
      allocationCount: 1,
    },
    {
      sprint: current,
      allocationId: 'allocation-2',
      plannedDays: 2.5,
      allocationNotes: '',
      allocationConflict: false,
      allocationCount: 1,
    },
    {
      sprint: future,
      allocationId: null,
      plannedDays: null,
      allocationNotes: '',
      allocationConflict: true,
      allocationCount: 2,
    },
  ],
  spillEvents: [
    { number: 1, fromSprint: historical, toSprint: current, reason: 'Dependency delay' },
    { number: 2, fromSprint: current, toSprint: future, reason: null },
  ],
  latestSpill: { number: 2, fromSprint: current, toSprint: future, reason: null },
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
    expect(text).not.toContain('Legacy duplicate reason');
    expect(text).not.toContain('No reason');
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
