import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { Jira } from '../../shared/models/api.models';
import { JiraDetailPage } from './jira-detail.page';
import { JiraService } from './jiras.service';
import { JiraLinkService } from './jira-link.service';
import { LinksService } from '../../core/platform/links.service';

describe('JiraDetailPage', () => {
  it('renders domain sections, separate tag chips, and no IDs', async () => {
    const jira: Jira = {
      id: 'hidden-jira-id',
      createdTime: '',
      lastEditedTime: '',
      jiraKey: 'CRI-1234',
      summary: 'Upgrade Angular',
      status: 'Blocked',
      tags: ['Sprint Work', 'Prod Support'],
      appraisal: true,
      spillover: true,
      spilloverCount: 1,
      spilloverReason: 'Dependency delay',
      inActiveSprint: true,
      demoRequired: true,
      demoedDate: null,
      demoNotes: 'Show migration',
      sprintIds: ['hidden-sprint-id'],
      projectIds: ['hidden-project-id'],
      blockedByIds: ['hidden-blocker-id'],
      releaseItemIds: ['hidden-release-id'],
      projects: [{ id: 'hidden-project-id', name: 'Cortellis Regulatory Intelligence' }],
      sprints: [{ id: 'hidden-sprint-id', name: 'Sprint 25.17' }],
      blockedBy: [{ id: 'hidden-blocker-id', key: 'CRI-1200', summary: 'Platform update' }],
    };
    await TestBed.configureTestingModule({
      imports: [JiraDetailPage],
      providers: [
        provideRouter([]),
        { provide: JiraService, useValue: { detail: () => of(jira) } },
        { provide: JiraLinkService, useValue: { externalUrl: () => of(null) } },
        { provide: LinksService, useValue: { open: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(JiraDetailPage);
    fixture.componentRef.setInput('jiraKey', 'CRI-1234');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const text = element.textContent ?? '';
    const chips = [...element.querySelectorAll('.status-badge')].map(chip => chip.textContent?.trim());
    expect(chips).toContain('Sprint Work');
    expect(chips).toContain('Prod Support');
    expect(text).toContain('Cortellis Regulatory Intelligence');
    expect(text).toContain('CRI-1200');
    expect(text).not.toContain('hidden-project-id');
    expect(text).not.toContain('hidden-release-id');
  });
});
