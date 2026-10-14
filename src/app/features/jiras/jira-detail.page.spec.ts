import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { LinksService } from '../../core/platform/links.service';
import { ReportOutputService } from '../../core/platform/report-output.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { reportPdf } from '../../core/platform/report-pdf';
import { jiraPdfFilename, jiraReport } from './jira-report';
import { JiraDetail, SprintRef } from '../../shared/models/api.models';
import { JiraDetailPage } from './jira-detail.page';
import { JiraLinkService } from './jira-link.service';
import { JiraService } from './jiras.service';
import { JiraSpillReasonEditorComponent } from './jira-spill-reason-editor.component';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { ReleaseService } from '../releases/releases.service';

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
  const output = { android: false, pdf: vi.fn<ReportOutputService['pdf']>() };
  const snackbar = { success: vi.fn(), error: vi.fn() };
  async function render(value = jira) {
    await TestBed.configureTestingModule({
      imports: [JiraDetailPage],
      providers: [
        provideRouter([]),
        { provide: ReportOutputService, useValue: output },
        { provide: SnackbarService, useValue: snackbar },
        { provide: JiraService, useValue: { detail: () => of(value), addToCurrentSprint: vi.fn() } },
        { provide: ReleaseService, useValue: { metadata: vi.fn() } },
        {
          provide: AlterControlsService,
          useValue: {
            refresh: vi.fn().mockResolvedValue(null),
            alterSprintEnabled: signal(false),
            alterReleaseManagementEnabled: signal(false),
          },
        },
        { provide: JiraLinkService, useValue: { externalUrl: () => of(null) } },
        { provide: LinksService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(JiraDetailPage);
    fixture.componentRef.setInput('jiraKey', 'CRI-1234');
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => {
    vi.resetAllMocks();
    TestBed.resetTestingModule();
  });

  it('exports the loaded JIRA and prevents repeated clicks while exporting', async () => {
    const fixture = await render();
    let complete!: () => void;
    output.pdf.mockImplementation(
      () =>
        new Promise<void>(resolve => {
          complete = resolve;
        }),
    );
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLElement>('.jira-pdf-export');
    button?.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.exporting()).toBe(true);
    expect(button?.getAttribute('aria-busy')).toBe('true');
    await fixture.componentInstance.exportPdf();
    expect(output.pdf).toHaveBeenCalledOnce();
    expect(output.pdf).toHaveBeenCalledWith(jiraReport(jira), 'office-orbit-jira-CRI-1234.pdf');
    complete();
    await fixture.whenStable();
    expect(fixture.componentInstance.exporting()).toBe(false);
    expect(snackbar.success).toHaveBeenCalledWith('JIRA PDF downloaded.');
  });

  it('reports export failures and allows another attempt', async () => {
    const fixture = await render();
    output.pdf.mockRejectedValueOnce(new Error('Native export unavailable'));
    await fixture.componentInstance.exportPdf();
    expect(snackbar.error).toHaveBeenCalledWith('Unable to export JIRA PDF. Please try again.');
    expect(fixture.componentInstance.exporting()).toBe(false);
    output.pdf.mockResolvedValueOnce();
    await fixture.componentInstance.exportPdf();
    expect(output.pdf).toHaveBeenCalledTimes(2);
  });

  it('does not export stale data while a refresh is loading', async () => {
    const fixture = await render();
    fixture.componentInstance.loading.set(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.jira-pdf-export')).toBeNull();
    await fixture.componentInstance.exportPdf();
    expect(output.pdf).not.toHaveBeenCalled();
  });

  it('includes all histories and collapsed content in a real PDF without internal IDs', async () => {
    const report = jiraReport(jira);
    const text = JSON.stringify(report);
    for (const section of [
      'Overview',
      'Description',
      'Sprint history',
      'Spill history',
      'Work history',
      'Relationships',
      'Release history',
      'Demo',
      'Record information',
    ]) {
      expect(report.records.some(record => record.date === section)).toBe(true);
    }
    expect(text).toContain(jira.description);
    expect(text).toContain(jira.relationships[0].otherJira.key);
    expect(text).toContain(jira.releaseItems[0].versionNumber);
    expect(text).not.toContain('hidden-');
    const blob = await reportPdf(report);
    expect(blob.type).toBe('application/pdf');
    expect(await blob.text()).toContain('%PDF-1.4');
    expect(await blob.text()).toContain('JIRA Detail');
    expect(jiraPdfFilename('../CRI/123')).toBe('office-orbit-jira----CRI-123.pdf');
  });

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

  it('renders Markdown spill reasons and exposes Add/Edit using the supplied event numbers', async () => {
    const value: JiraDetail = {
      ...jira,
      sprintHistory: jira.sprintHistory.map(history => ({
        ...history,
        allocationId: 'allocation',
        allocationConflict: false,
        allocationCount: 1,
      })),
      // Deliberately reorder events: the event number must never come from array position.
      spillEvents: [
        { ...jira.spillEvents[1], reason: null },
        { ...jira.spillEvents[0], reason: 'Blocked by **DevOps**\n\n- Pipeline\n- Deployment' },
      ],
    };
    const fixture = await render(value);
    const element = fixture.nativeElement as HTMLElement;
    const viewer = element.querySelector('.spill-reason app-markdown-viewer');
    expect(viewer?.querySelector('strong')?.textContent).toBe('DevOps');
    expect(viewer?.querySelectorAll('li')).toHaveLength(2);
    expect(viewer?.textContent).not.toContain('**');
    const cards = element.querySelectorAll<HTMLElement>('.spill-event');
    expect(cards[0].querySelector('.spill-reason-action')?.textContent).toContain('Edit reason');
    expect(cards[0].querySelector('.spill-reason-action ion-icon')?.getAttribute('name')).toBe('create-outline');
    expect(cards[0].querySelector('.spill-reason-copy')?.getAttribute('aria-label')).toBe('Copy reason for spill #1');
    expect(cards[1].querySelector('.spill-reason-copy')).toBeNull();
    expect(cards[1].querySelector('.spill-reason-action')?.textContent).toContain('Add reason');
    expect(cards[1].textContent).toContain('No spill reason recorded.');
    cards[0].querySelector<HTMLElement>('.spill-reason-action')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedSpillEvent()?.number).toBe(1);
    const editor = fixture.debugElement.query(By.directive(JiraSpillReasonEditorComponent))
      .componentInstance as JiraSpillReasonEditorComponent;
    expect(editor.event().number).toBe(1);
    fixture.componentInstance.selectedSpillEvent.set(null);
    fixture.detectChanges();
    cards[1].querySelector<HTMLElement>('.spill-reason-action')!.click();
    expect(fixture.componentInstance.selectedSpillEvent()?.number).toBe(2);
  });

  it('copies only the exact reason source, preserving Markdown and whitespace without editing the spill', async () => {
    const fixture = await render();
    const reason = '  **Dependency**\n\n- Pipeline\n  - [Deployment](https://example.com)\n';
    const writeText = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      await fixture.componentInstance.copySpillReason({ ...jira.spillEvents[0], reason });
      expect(writeText).toHaveBeenCalledExactlyOnceWith(reason);
      expect(fixture.componentInstance.item()).toBe(jira);
      expect(fixture.componentInstance.selectedSpillEvent()).toBeNull();
      expect(TestBed.inject(SnackbarService).success).toHaveBeenCalledWith('Spill reason copied.');
      expect(fixture.componentInstance.copyingSpillReason()).toBeNull();
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('reports clipboard failure and resets the copy control for retry', async () => {
    const fixture = await render();
    const writeText = vi.fn().mockRejectedValue(new Error('Permission denied'));
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      await fixture.componentInstance.copySpillReason(jira.spillEvents[0]);
      expect(TestBed.inject(SnackbarService).error).toHaveBeenCalledWith(
        'Unable to copy spill reason. Please try again.',
      );
      expect(fixture.componentInstance.copyingSpillReason()).toBeNull();
      expect(TestBed.inject(SnackbarService).success).not.toHaveBeenCalled();
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('copies normal text without Markdown markers while retaining readable list structure', async () => {
    const fixture = await render();
    const writeText = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    try {
      await fixture.componentInstance.copySpillReason(
        {
          ...jira.spillEvents[0],
          reason: '## Delay\n\n**Blocked** by [DevOps](https://example.com)\n\n- Pipeline\n- Deployment',
        },
        'text',
      );
      expect(writeText).toHaveBeenCalledExactlyOnceWith('Delay\n\nBlocked by DevOps\n\n• Pipeline\n\n• Deployment');
    } finally {
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('copies formatted text as safe HTML and a plain text fallback', async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    const original = Object.getOwnPropertyDescriptor(navigator, 'clipboard');
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { write } });
    class TestClipboardItem {
      constructor(readonly data: Record<string, Blob>) {}
      static supports(type: string): boolean {
        return type === 'text/html';
      }
    }
    vi.stubGlobal('ClipboardItem', TestClipboardItem);
    try {
      const fixture = await render();
      expect(fixture.componentInstance.richCopySupported).toBe(true);
      await fixture.componentInstance.copySpillReason(
        { ...jira.spillEvents[0], reason: '**Blocked**\n\n- Pipeline\n\n[DevOps](https://example.com)' },
        'formatted',
      );
      const item = (write.mock.calls[0][0] as TestClipboardItem[])[0];
      const readText = (blob: Blob) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(reader.error);
          reader.readAsText(blob);
        });
      const html = await readText(item.data['text/html']);
      expect(html).toContain('<strong>Blocked</strong>');
      expect(html).toContain('<li>Pipeline</li>');
      expect(html).toContain('href="https://example.com"');
      expect(await readText(item.data['text/plain'])).toBe('Blocked\n\n• Pipeline\n\nDevOps');
    } finally {
      vi.unstubAllGlobals();
      if (original) Object.defineProperty(navigator, 'clipboard', original);
      else Reflect.deleteProperty(navigator, 'clipboard');
    }
  });

  it('replaces the detail with the saved response, closes the editor and avoids another GET', async () => {
    const fixture = await render();
    const page = fixture.componentInstance;
    page.openSpillReasonEditor(jira.spillEvents[0]);
    fixture.detectChanges();
    const editor = fixture.debugElement.query(By.directive(JiraSpillReasonEditorComponent))
      .componentInstance as JiraSpillReasonEditorComponent;
    const detail = vi.spyOn(TestBed.inject(JiraService), 'detail');
    const refreshed = {
      ...jira,
      spillEvents: [{ ...jira.spillEvents[0], reason: '**Updated** reason' }, jira.spillEvents[1]],
    };
    editor.saved.emit(refreshed);
    fixture.detectChanges();
    expect(page.item()).toBe(refreshed);
    expect(page.selectedSpillEvent()).toBeNull();
    expect(detail).not.toHaveBeenCalled();
    expect(snackbar.success).toHaveBeenCalledWith('Spill reason updated.');
    page.openSpillReasonEditor(refreshed.spillEvents[0]);
    page.spillReasonSaved({ ...refreshed, spillEvents: [{ ...refreshed.spillEvents[0], reason: '' }] });
    expect(snackbar.success).toHaveBeenLastCalledWith('Spill reason cleared.');
    page.editOpen.set(true);
    page.edited(refreshed);
    expect(page.editOpen()).toBe(false);
    expect(page.item()).toBe(refreshed);
  });

  it.each([
    [false, 'Add a Sprint Allocation'],
    [true, 'Resolve the Sprint Allocation conflict'],
  ])('disables editing with a helpful hint for missing/conflicting allocations (%s)', async (conflict, message) => {
    const value: JiraDetail = {
      ...jira,
      sprintHistory: jira.sprintHistory.map(history => ({
        ...history,
        allocationId: null,
        allocationConflict: conflict,
      })),
    };
    const fixture = await render(value);
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLIonButtonElement>(
      'ion-button.spill-reason-action',
    );
    expect(button?.disabled).toBe(true);
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('.spill-event .allocation-warning')?.textContent,
    ).toContain(message);
    fixture.componentInstance.openSpillReasonEditor(value.spillEvents[0]);
    expect(fixture.componentInstance.selectedSpillEvent()).toBeNull();
  });

  it('renders Work History comments and issues through the shared Markdown viewer', async () => {
    const fixture = await render();
    const history = (fixture.nativeElement as HTMLElement).querySelector('.work-history-list');
    const markdown = history?.querySelectorAll('app-markdown-viewer');

    expect(markdown).toHaveLength(2);
    expect(markdown?.[0].textContent).toContain('Migrated the build.');
    expect(markdown?.[1].textContent).toContain('Pipeline was unavailable.');
  });

  it('renders server-authoritative relationships, JIRA description, and spill history state', async () => {
    const fixture = await render();
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';
    const relationships = element.querySelector('.relationships-section');
    const cards = relationships?.querySelectorAll('.relationship-grid > .relationship-item');

    expect(relationships).toBeTruthy();
    expect(relationships?.querySelector('.relationship-grid')).toBeTruthy();
    expect(cards).toHaveLength(2);
    expect(text).toContain('Move the client to the current JIRA contract.');
    expect(text).toContain('First Sprint Start');
    expect(text).toContain('Spill history needs review');
    expect(text).toContain('Spilled');
    expect(text).toContain('Blocks');
    expect(text).toContain('Depends on');
    expect(text).toContain('CRI-1200');
    expect(text).toContain('CRI-1201');
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
