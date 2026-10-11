import { TestBed } from '@angular/core/testing';
import { IonModal } from '@ionic/angular';
import { of } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { EditorModalStubComponent } from '../../shared/testing/editor-modal.stub';
import { Feedback } from '../../shared/models/api.models';
import { FeedbackEditorComponent } from './feedback-editor.component';

describe('FeedbackEditorComponent', () => {
  it('loads and formats both Markdown fields and submits their source with newlines intact', async () => {
    const item: Feedback = {
      id: 'existing',
      createdTime: '',
      lastEditedTime: '',
      feedback: 'Helpful review',
      date: null,
      feedbackFrom: '',
      personType: null,
      context: null,
      feedbackType: null,
      workType: null,
      details: 'First paragraph\n\n- One\n- Two',
      actionFollowUp: 'Verify **production**\n\nNext step',
      companyIds: [],
      teamIds: [],
    };
    const patch = vi.fn(() => of({ data: item }));
    const confirm = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      imports: [FeedbackEditorComponent],
      providers: [
        { provide: MutationApiService, useValue: { metadata: () => of({ resource: 'feedback', fields: [] }), patch } },
        { provide: RelationOptionsService, useValue: { load: () => of([]) } },
        { provide: ConfirmationService, useValue: { confirm } },
      ],
    }).overrideComponent(FeedbackEditorComponent, {
      remove: { imports: [IonModal] },
      add: { imports: [EditorModalStubComponent] },
    });
    const fixture = TestBed.createComponent(FeedbackEditorComponent);
    fixture.componentRef.setInput('item', item);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const editors = element.querySelectorAll('app-markdown-input');
    expect(editors).toHaveLength(2);
    const textarea = editors[0].querySelector('textarea')!;
    expect(textarea.value).toBe(item.details);
    expect(editors[1].querySelector('textarea')?.value).toBe(item.actionFollowUp);
    textarea.setSelectionRange(0, 5);
    editors[0].querySelector<HTMLButtonElement>('[aria-label="Bold"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.details.value).toBe('**First** paragraph\n\n- One\n- Two');
    expect(fixture.componentInstance.form.dirty).toBe(true);
    await fixture.componentInstance.requestClose();
    expect(confirm).toHaveBeenCalled();
    await fixture.componentInstance.save();
    expect(patch).toHaveBeenCalledWith(
      '/api/feedback',
      'existing',
      expect.objectContaining({
        details: '**First** paragraph\n\n- One\n- Two',
        actionFollowUp: item.actionFollowUp,
      }),
    );
    fixture.componentInstance.form.controls.feedback.setValue('');
    expect(fixture.componentInstance.canSave()).toBe(false);
  });

  it('submits option and relation IDs without project or derived Work Type', async () => {
    const response = {
      id: 'new',
      createdTime: '',
      lastEditedTime: '',
      feedback: 'Helpful review',
      date: null,
      feedbackFrom: '',
      personType: null,
      context: null,
      feedbackType: null,
      workType: 'Office Work',
      details: '',
      actionFollowUp: '',
      companyIds: [],
      teamIds: [],
    };
    const create = vi.fn().mockReturnValue(of({ data: response }));
    await TestBed.configureTestingModule({
      imports: [FeedbackEditorComponent],
      providers: [
        { provide: MutationApiService, useValue: { create, patch: vi.fn() } },
        { provide: RelationOptionsService, useValue: {} },
      ],
    }).compileComponents();
    const component = TestBed.createComponent(FeedbackEditorComponent).componentInstance;
    component.form.setValue({
      feedback: 'Helpful review',
      date: '',
      feedbackFrom: 'Manager',
      personTypeOptionId: 'person-id',
      contextOptionId: 'context-id',
      feedbackTypeOptionId: 'feedback-type-id',
      companyId: 'company-id',
      teamId: 'team-id',
      details: 'Details',
      actionFollowUp: '',
    });
    await component.save();
    expect(create).toHaveBeenCalledWith('/api/feedback', {
      feedback: 'Helpful review',
      date: null,
      feedbackFrom: 'Manager',
      personTypeOptionId: 'person-id',
      contextOptionId: 'context-id',
      feedbackTypeOptionId: 'feedback-type-id',
      companyId: 'company-id',
      teamId: 'team-id',
      details: 'Details',
      actionFollowUp: '',
    });
    expect(create.mock.calls[0][1]).not.toHaveProperty('workType');
    expect(create.mock.calls[0][1]).not.toHaveProperty('projectId');
  });
});
