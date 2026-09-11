import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { LinksService } from '../../core/platform/links.service';
import { Jira, ReleaseItem, Sprint, SprintAllocation, SprintDetailJira, WorkLog } from '../../shared/models/api.models';
import { ResourcePage } from './resource.page';

const route = { snapshot: { queryParamMap: convertToParamMap({}) } };

describe('ResourcePage presentation', () => {
  afterEach(() => TestBed.resetTestingModule());
  it('uses independent sparse release cards and product result counts without an empty expander', async () => {
    const release: ReleaseItem = {
      id: 'private-release-id',
      createdTime: '',
      lastEditedTime: '',
      releaseItem: 'Delivery',
      componentName: '',
      deploymentType: null,
      versionNumber: '',
      branch: '',
      formalAnnouncedDate: null,
      confirmedReleaseDate: null,
      notes: '',
      jiraIds: [],
      jiraStatuses: [],
      sprintIds: [],
      spilloverCount: 0,
      jiras: [],
    };
    await TestBed.configureTestingModule({
      imports: [ResourcePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: LinksService, useValue: {} },
        {
          provide: ReadFeatureService,
          useValue: {
            heading: 'Releases',
            description: '',
            kind: 'releases',
            views: [{ label: 'All', path: '/api/releases' }],
            list: () => of({ data: [release], count: 1, hasMore: false, nextCursor: null, lastUpdated: Date.now() }),
            updatedAt: () => Date.now(),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ResourcePage);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    expect(element.querySelectorAll('.release-card')).toHaveLength(1);
    expect(element.querySelector('.release-card details')).toBeNull();
    expect(element.textContent).toContain('1 release');
    expect(element.textContent).not.toContain('private-release-id');
    expect(element.textContent).not.toContain('Load more');
    expect(element.textContent).not.toContain('items on this page');
  });

  it('renders a compact Work Log and hides empty fields and internal IDs', async () => {
    const workLog: WorkLog = {
      id: 'hidden-log-id',
      createdTime: '2026-09-02T10:32:00.000Z',
      lastEditedTime: '2026-09-02T11:32:00.000Z',
      update: 'Architecture discussion',
      date: '2026-09-02',
      category: 'Office Work',
      type: 'Meeting',
      workMode: 'WFO',
      comment: '',
      wentWrong: '',
      appraisal: false,
      projectIds: ['hidden-project-id'],
      jiraIds: [],
      companyIds: [],
      teamIds: [],
      jiraStatuses: [],
      sprintIds: [],
      spilloverCount: 0,
      projects: [{ id: 'hidden-project-id', name: 'Cortellis Regulatory Intelligence' }],
    };
    await TestBed.configureTestingModule({
      imports: [ResourcePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: LinksService, useValue: { open: vi.fn() } },
        {
          provide: ReadFeatureService,
          useValue: {
            heading: 'Work Log',
            description: 'History',
            kind: 'work-logs',
            views: [{ label: 'All', path: '/api/work-logs' }],
            list: () => of({ data: [workLog], count: 1, hasMore: false, nextCursor: null }),
            updatedAt: () => Date.now(),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ResourcePage);
    fixture.detectChanges();
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.activity-row')?.click();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Architecture discussion');
    expect(text).toContain('Sep 2, 2026');
    expect(text).toContain('Cortellis Regulatory Intelligence');
    expect(text).not.toContain('hidden-log-id');
    expect(text).not.toContain('hidden-project-id');
    expect(text).not.toContain('Went wrong');
    expect(text).not.toContain('All details');
  });

  it('renders a compact JIRA row with relation names and hides relation IDs', async () => {
    const item = {
      id: 'hidden-jira-id',
      createdTime: '',
      lastEditedTime: '',
      jiraKey: 'CRI-1234',
      summary: 'Upgrade Angular',
      status: 'In Progress',
      tags: ['Sprint Work', 'Prod Support'],
      appraisal: false,
      spillover: false,
      spilloverCount: 0,
      spilloverReason: '',
      inActiveSprint: true,
      demoRequired: false,
      demoedDate: null,
      demoNotes: '',
      sprintIds: ['hidden-sprint-id'],
      projectIds: [],
      blockedByIds: [],
      releaseItemIds: [],
      sprints: [
        { id: 'current-sprint-id', name: 'Sprint 25.17', active: true, startDate: null, endDate: null },
        { id: 'hidden-sprint-id', name: 'Sprint history', active: false, startDate: null, endDate: null },
      ],
    } satisfies Jira;
    await TestBed.configureTestingModule({
      imports: [ResourcePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: LinksService, useValue: { open: vi.fn() } },
        {
          provide: ReadFeatureService,
          useValue: {
            heading: 'JIRAs',
            description: 'Priorities',
            kind: 'jiras',
            views: [{ label: 'Active', path: '/api/jiras/active' }],
            list: () => of({ data: [item], count: 1, hasMore: false, nextCursor: null }),
            updatedAt: () => Date.now(),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ResourcePage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('CRI-1234');
    expect(text).toContain('Sprint 25.17');
    expect(text).not.toContain('Sprint history');
    expect(text).not.toContain('hidden-sprint-id');
    expect(fixture.nativeElement.querySelectorAll('.status-badge').length).toBeGreaterThan(1);
  });

  it('links Sprint cards and enriches allocation rows with compact JIRA details', async () => {
    const sprint: Sprint = {
      id: 'sprint/id',
      sprint: 'Sprint 6',
      active: true,
      startDate: null,
      endDate: null,
      weekOff1: null,
      weekOff2: null,
      plannedLeaveDays: 0,
      holidayDays: 0,
      capacityDays: 10,
      availableDays: 10,
      allocatedDays: 4,
      remainingDays: 6,
      projectIds: [],
      allocationIds: [],
    };
    const allocation: SprintAllocation = {
      id: 'allocation-id',
      allocation: 'CRI-1 allocation',
      plannedDays: 4,
      notes: '',
      sprintIds: [sprint.id],
      jiraIds: ['jira-id'],
      sprintActive: true,
    };
    const allocationJira: SprintDetailJira = {
      id: 'jira-id',
      jiraKey: 'LSC-85120',
      summary: 'GRC alert migration to first-party services',
      status: 'In progress',
      tags: ['Migration'],
      spillover: true,
      spilloverCount: 1,
      plannedDays: 4,
      allocationId: allocation.id,
      allocationNotes: '',
      allocationConflict: false,
      allocationCount: 1,
    };
    await TestBed.configureTestingModule({
      imports: [ResourcePage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: route },
        { provide: LinksService, useValue: { open: vi.fn() } },
        {
          provide: ReadFeatureService,
          useValue: {
            heading: 'Sprints',
            description: '',
            kind: 'sprints',
            views: [{ label: 'All', path: '/api/sprints' }],
            list: () => of({ data: [sprint, allocation], count: 2, hasMore: false, nextCursor: null }),
            allocationJiras: () => of({ [allocation.id]: [allocationJira] }),
            updatedAt: () => Date.now(),
          },
        },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ResourcePage);
    fixture.detectChanges();
    const sprintLink = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('.sprint-card');
    expect(sprintLink?.href).toContain('/app/sprints/sprint%2Fid');
    expect(fixture.nativeElement.querySelector('.allocation-row')?.tagName).toBe('ARTICLE');
    const allocationLink = fixture.nativeElement.querySelector<HTMLAnchorElement>('.allocation-jira-link');
    expect(allocationLink?.href).toContain('/app/jiras/LSC-85120');
    expect(allocationLink?.textContent).toContain('GRC alert migration to first-party services');
    expect(allocationLink?.textContent).toContain('In progress');
    expect(allocationLink?.textContent).toContain('Spilled once');
    const allocationArrow = fixture.nativeElement.querySelector('.allocation-row > .allocation-arrow');
    expect(allocationArrow).toBeTruthy();
  });
});
