import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { FeedbackEditorComponent } from './feedback-editor.component';

describe('FeedbackEditorComponent', () => {
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
