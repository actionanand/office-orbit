import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { IonModal } from '@ionic/angular';
import { Subject, of, throwError } from 'rxjs';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { MarkdownInputComponent } from '../../shared/components/markdown-input.component';
import { JiraDetail, MutationResponse, SpillEvent } from '../../shared/models/api.models';
import { EditorModalStubComponent } from '../../shared/testing/editor-modal.stub';
import { JiraSpillReasonEditorComponent } from './jira-spill-reason-editor.component';
import { JiraService } from './jiras.service';

const reason = 'Blocked by **DevOps**\n\n- pipeline failed\n- deployment delayed\n';
const sprint = { id: 'receiving', name: 'Sprint 6', active: false, startDate: null, endDate: null };
const event: SpillEvent = {
  number: 2,
  fromSprint: { ...sprint, id: 'previous', name: 'Sprint 5' },
  toSprint: sprint,
  reason,
};
const refreshed: JiraDetail = {
  id: 'jira-id',
  createdTime: '',
  lastEditedTime: '',
  jiraKey: 'LSC-84944',
  summary: 'Upgrade',
  status: null,
  tags: [],
  appraisal: false,
  spillover: true,
  spilloverCount: 2,
  description: '',
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
  spillEvents: [event],
  latestSpill: event,
  relationships: [],
  spillHistoryConsistent: true,
  timeline: { startedDate: null, endedDate: null },
  workLogs: [],
  workLogCount: 0,
  releaseItems: [],
  releaseItemCount: 0,
};

describe('JiraSpillReasonEditorComponent', () => {
  async function render(value = event) {
    const updateSpillReason = vi.fn<JiraService['updateSpillReason']>(() => of({ data: refreshed }));
    const confirm = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      imports: [JiraSpillReasonEditorComponent],
      providers: [
        { provide: JiraService, useValue: { updateSpillReason } },
        { provide: ConfirmationService, useValue: { confirm } },
      ],
    }).overrideComponent(JiraSpillReasonEditorComponent, {
      remove: { imports: [IonModal] },
      add: { imports: [EditorModalStubComponent] },
    });
    const fixture = TestBed.createComponent(JiraSpillReasonEditorComponent);
    fixture.componentRef.setInput('jiraKey', 'LSC-84944');
    fixture.componentRef.setInput('event', value);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    return {
      fixture,
      element,
      textarea: element.querySelector<HTMLTextAreaElement>('textarea')!,
      component: fixture.componentInstance,
      updateSpillReason,
      confirm,
    };
  }

  it('loads the exact existing source in the basic editor, identifies the event, and emits refreshed detail', async () => {
    const { fixture, element, textarea, component, updateSpillReason } = await render();
    expect(textarea.value).toBe(reason);
    expect(component.form.pristine).toBe(true);
    const editor = fixture.debugElement.query(By.directive(MarkdownInputComponent))
      .componentInstance as MarkdownInputComponent;
    expect(editor.variant()).toBe('basic');
    expect(element.querySelector('ion-title')?.textContent).toContain('Edit spill reason · Spill #2');
    const saved = vi.fn();
    component.saved.subscribe(saved);
    await component.save();
    expect(updateSpillReason).toHaveBeenCalledWith('LSC-84944', 2, reason);
    expect(updateSpillReason.mock.calls[0]).toHaveLength(3);
    expect(saved).toHaveBeenCalledWith(refreshed);
  });

  it('starts an empty event as Add and formats Markdown without submitting the form', async () => {
    const { fixture, element, textarea, component, updateSpillReason, confirm } = await render({
      ...event,
      reason: null,
    });
    expect(textarea.value).toBe('');
    expect(element.querySelector('ion-title')?.textContent).toContain('Add spill reason');
    textarea.value = 'New reason';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.setSelectionRange(0, 3);
    element.querySelector<HTMLButtonElement>('[aria-label="Bold"]')!.click();
    fixture.detectChanges();
    expect(component.form.controls.reasonMarkdown.value).toBe('**New** reason');
    expect(updateSpillReason).not.toHaveBeenCalled();
    expect(component.form.dirty).toBe(true);
    await component.requestClose();
    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({ title: 'Discard spill reason changes?' }));
  });

  it('sends an empty string to clear an existing reason', async () => {
    const { textarea, component, updateSpillReason } = await render();
    textarea.value = '';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    await component.save();
    expect(updateSpillReason).toHaveBeenCalledWith('LSC-84944', 2, '');
  });

  it('disables editing and dismissal while saving and prevents double submission', async () => {
    const { fixture, textarea, component, updateSpillReason } = await render();
    const response = new Subject<MutationResponse<JiraDetail>>();
    updateSpillReason.mockReturnValue(response);
    const pending = component.save();
    fixture.detectChanges();
    expect(textarea.disabled).toBe(true);
    expect(await component.canDismiss()).toBe(false);
    await component.save();
    expect(updateSpillReason).toHaveBeenCalledOnce();
    response.next({ data: refreshed });
    response.complete();
    await pending;
    expect(component.submitting()).toBe(false);
    expect(component.form.enabled).toBe(true);
  });

  it.each([
    ['JIRA_NOT_SPILLED', 'This JIRA no longer has a spill event.'],
    ['SPILL_EVENT_NOT_FOUND', 'This spill event no longer exists. Refresh the JIRA.'],
    ['SPILL_ALLOCATION_MISSING', 'The receiving Sprint has no Sprint Allocation.'],
    ['SPILL_ALLOCATION_CONFLICT', 'Multiple Sprint Allocations exist for the receiving Sprint.'],
  ])('keeps source/editor open and shows the Worker conflict %s', async (code, message) => {
    const { fixture, element, component, updateSpillReason } = await render();
    updateSpillReason.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 409, error: { code } })));
    const saved = vi.fn();
    const closed = vi.fn();
    component.saved.subscribe(saved);
    component.closed.subscribe(closed);
    await component.save();
    fixture.detectChanges();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(component.form.controls.reasonMarkdown.value).toBe(reason);
    expect(component.open()).toBe(true);
    expect(component.submitting()).toBe(false);
    expect(saved).not.toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
  });

  it('shows network errors and lets the user retry', async () => {
    const { component, updateSpillReason } = await render();
    updateSpillReason.mockReturnValueOnce(throwError(() => new HttpErrorResponse({ status: 0 })));
    await component.save();
    expect(component.saveError()).toContain('Check your connection');
    await component.save();
    expect(component.saveError()).toBe('');
    expect(updateSpillReason).toHaveBeenCalledTimes(2);
  });
});
