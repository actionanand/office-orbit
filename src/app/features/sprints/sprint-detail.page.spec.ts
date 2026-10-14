import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Sprint, SprintDetailJira, SprintDetailResponse } from '../../shared/models/api.models';
import { formatTodayLabel } from '../../shared/utils/format';
import { SprintDetailPage } from './sprint-detail.page';
import { SprintService } from './sprints.service';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { WorkCalendarService } from '../productivity/work-calendar.service';

const sprint: Sprint = {
  id: 'sprint-6',
  sprint: 'Sprint 6',
  active: true,
  startDate: '2026-09-02',
  endDate: '2026-09-15',
  weekOff1: 'Saturday',
  weekOff2: 'Sunday',
  plannedLeaveDays: 1,
  holidayDays: 1,
  capacityDays: 10,
  availableDays: 8,
  allocatedDays: 8,
  remainingDays: 0,
  projectIds: ['project-id'],
  allocationIds: ['allocation-id'],
  projects: [{ id: 'project-id', name: 'Cortellis Regulatory Intelligence' }],
};
const jira = (overrides: Partial<SprintDetailJira>): SprintDetailJira => ({
  id: 'jira-1',
  jiraKey: 'CRI-1',
  summary: 'Upgrade Angular',
  status: 'In progress',
  tags: [],
  spillover: false,
  spilloverCount: 0,
  plannedDays: 2.5,
  allocationId: 'allocation-1',
  allocationNotes: '',
  allocationConflict: false,
  allocationCount: 1,
  ...overrides,
});
const response: SprintDetailResponse = {
  sprint,
  jiras: [
    jira({}),
    jira({ id: 'jira-2', jiraKey: 'CRI-2', summary: 'Cancelled work', status: 'Cancelled', plannedDays: 6 }),
    jira({ id: 'jira-3', jiraKey: 'CRI-3', summary: 'Completed work', status: 'Done', plannedDays: 1 }),
    jira({
      id: 'jira-4',
      jiraKey: 'CRI-4',
      summary: 'Duplicate allocation',
      plannedDays: null,
      allocationId: null,
      allocationConflict: true,
      allocationCount: 2,
    }),
  ],
  count: 4,
};

describe('SprintDetailPage', () => {
  async function render(value: SprintDetailResponse) {
    await TestBed.configureTestingModule({
      imports: [SprintDetailPage],
      providers: [
        provideRouter([]),
        { provide: SprintService, useValue: { detail: () => of(value) } },
        {
          provide: AlterControlsService,
          useValue: { refresh: vi.fn().mockResolvedValue(null), alterSprintEnabled: signal(true) },
        },
        { provide: RelationOptionsService, useValue: { load: () => of([]) } },
        { provide: WorkCalendarService, useValue: { get: () => of({ weekOffDays: ['Saturday', 'Sunday'] }) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SprintDetailPage);
    fixture.componentRef.setInput('sprintId', value.sprint.id);
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('renders active Sprint overview, today, capacity, and every returned JIRA without status filtering', async () => {
    const fixture = await render(response);
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';
    expect(text).toContain('Sprint 6');
    expect(text).toContain(`Today: ${formatTodayLabel()}`);
    expect(text).toContain('Cortellis Regulatory Intelligence');
    expect(text).toContain('Saturday, Sunday');
    expect(text).toContain('Available');
    expect(text).toContain('Edit Sprint');
    expect(text).toContain('Plan bandwidth');
    expect(text).toContain('Cancelled work');
    expect(text).toContain('Completed work');
    expect(element.querySelectorAll('.sprint-jira-row')).toHaveLength(4);
    expect(
      [...element.querySelectorAll<HTMLAnchorElement>('.sprint-jira-link')].some(link =>
        link.href.endsWith('/app/jiras/CRI-2'),
      ),
    ).toBe(true);
  });

  it('renders planned days and a safe allocation-conflict warning without a fabricated value', async () => {
    const fixture = await render(response);
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Planned: 2.5 days');
    expect(text).toContain('Planned: 1 day');
    expect(text).toContain('Allocation conflict');
    expect(text).toContain('2 records');
    expect(text).not.toContain('Planned: null');
  });

  it('keeps the JIRA navigation link, edit action, and final chevron in distinct row elements', async () => {
    const fixture = await render(response);
    const row = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.sprint-jira-row');
    const link = row?.querySelector<HTMLAnchorElement>('.sprint-jira-link');
    const action = row?.querySelector<HTMLElement>('.sprint-jira-actions ion-button');
    const arrow = row?.querySelector<HTMLElement>('.sprint-jira-chevron');

    expect(link?.href).toContain('/app/jiras/CRI-1');
    expect(link?.textContent).toContain('Upgrade Angular');
    expect(action?.closest('a')).toBeNull();
    expect(arrow?.compareDocumentPosition(action as Node)).toBe(Node.DOCUMENT_POSITION_PRECEDING);

    action?.dispatchEvent(new Event('click', { bubbles: true }));
    fixture.detectChanges();
    expect(fixture.componentInstance.editingJira()?.id).toBe('jira-1');
  });

  it('does not show today for an inactive Sprint and handles missing dates without invalid text', async () => {
    const fixture = await render({ ...response, sprint: { ...sprint, active: false, startDate: null, endDate: null } });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).not.toContain('Today:');
    expect(text).not.toContain('Plan bandwidth');
    expect(text).not.toContain('Invalid Date');
    expect(text).not.toContain('undefined');
    expect(text).not.toContain('null');
  });
});
