import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { IonModal } from '@ionic/angular';
import { of } from 'rxjs';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { JiraDetail } from '../../shared/models/api.models';
import { EditorModalStubComponent } from '../../shared/testing/editor-modal.stub';
import { JiraEditComponent } from './jira-edit.component';
import { JiraService } from './jiras.service';

const description = 'First paragraph\n\n- Item one\n- Item two\n\nLast paragraph\n\n1. One\n2. Two';
const jira: JiraDetail = {
  id: 'jira-id',
  createdTime: '',
  lastEditedTime: '',
  jiraKey: 'LSC-123',
  summary: 'Angular upgrade',
  status: null,
  tags: [],
  appraisal: false,
  spillover: false,
  spilloverCount: 0,
  description,
  firstSprintStart: null,
  inActiveSprint: false,
  demoRequired: false,
  demoedDate: null,
  demoNotes: '',
  sprintIds: [],
  projectIds: [],
  linkedJiraIds: [],
  linkedFromIds: [],
  linkType: null,
  linkReason: '',
  linkedOn: null,
  resolvedOn: null,
  releaseItemIds: [],
  sprintHistory: [],
  spillEvents: [],
  latestSpill: null,
  relationships: [],
  spillHistoryConsistent: true,
  timeline: { startedDate: null, endedDate: null },
  workLogs: [],
  workLogCount: 0,
  releaseItems: [],
  releaseItemCount: 0,
};

describe('JiraEditComponent Markdown description', () => {
  async function render() {
    const update = vi.fn(() => of({ data: jira }));
    const confirm = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      imports: [JiraEditComponent],
      providers: [
        provideHttpClient(),
        { provide: JiraService, useValue: { editMetadata: () => of({ resource: 'jiras', fields: [] }), update } },
        { provide: RelationOptionsService, useValue: { load: () => of([]) } },
        { provide: ConfirmationService, useValue: { confirm } },
      ],
    }).overrideComponent(JiraEditComponent, {
      remove: { imports: [IonModal] },
      add: { imports: [EditorModalStubComponent] },
    });
    const fixture = TestBed.createComponent(JiraEditComponent);
    fixture.componentRef.setInput('item', jira);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const textarea = element.querySelector<HTMLTextAreaElement>('app-markdown-input textarea')!;
    return { fixture, element, textarea, update, confirm, component: fixture.componentInstance };
  }

  it('loads raw Markdown unchanged and omits an untouched description from the PATCH', async () => {
    const { component, element, textarea, update } = await render();
    expect(textarea.value).toBe(description);
    expect(component.form.controls.descriptionMarkdown.value).toBe(description);
    expect(component.form.pristine).toBe(true);
    expect(element.querySelector('[contenteditable]')).toBeNull();
    expect(component.patchBody()).toEqual({});
    await component.save();
    expect(update).not.toHaveBeenCalled();
  });

  it('keeps middle edits at the correct caret and sends a description-only Markdown PATCH', async () => {
    const { component, fixture, textarea, update } = await render();
    const position = description.indexOf('Item two') + 8;
    textarea.setSelectionRange(position, position);
    textarea.setRangeText(' updated', position, position, 'end');
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    const expected = description.slice(0, position) + ' updated' + description.slice(position);
    expect(textarea.selectionStart).toBe(position + 8);
    expect(component.form.dirty).toBe(true);
    expect(component.patchBody()).toEqual({ descriptionMarkdown: expected });
    await component.save();
    expect(update).toHaveBeenCalledWith('LSC-123', { descriptionMarkdown: expected });
    expect(component.form.pristine).toBe(true);
  });

  it('formats only the selected text and confirms discard for description-only edits', async () => {
    const { component, fixture, element, textarea, confirm } = await render();
    const position = description.indexOf('Item two');
    textarea.setSelectionRange(position, position + 8);
    element.querySelector<HTMLButtonElement>('[aria-label="Bold"]')!.click();
    fixture.detectChanges();
    expect(component.form.controls.descriptionMarkdown.value).toContain('- **Item two**');
    expect(textarea.value.slice(textarea.selectionStart, textarea.selectionEnd)).toBe('Item two');
    await component.requestClose();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Discard JIRA changes?' }));
    expect(component.form.dirty).toBe(true);
    // Returning to the initial source also avoids an unnecessary PATCH.
    component.form.controls.descriptionMarkdown.setValue(description);
    expect(component.patchBody()).toEqual({});
  });

  it('preserves Summary validation and includes only its changed field', async () => {
    const { component } = await render();
    component.form.controls.summary.setValue('');
    expect(component.form.invalid).toBe(true);
    component.form.controls.summary.setValue('Updated summary');
    component.form.controls.summary.markAsDirty();
    expect(component.patchBody()).toEqual({ summary: 'Updated summary' });
  });
});
