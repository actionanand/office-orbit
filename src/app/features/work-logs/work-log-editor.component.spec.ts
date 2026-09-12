import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { workLogFixture } from '../../shared/models/work-log.fixture';
import { WorkLogEditorComponent } from './work-log-editor.component';

describe('WorkLogEditorComponent', () => {
  it('submits writable option and relation IDs once', async () => {
    const create = vi.fn().mockReturnValue(of({ data: workLogFixture('new') }));
    await TestBed.configureTestingModule({
      imports: [WorkLogEditorComponent],
      providers: [
        { provide: MutationApiService, useValue: { create, patch: vi.fn() } },
        { provide: RelationOptionsService, useValue: {} },
      ],
    }).compileComponents();
    const component = TestBed.createComponent(WorkLogEditorComponent).componentInstance;
    component.form.setValue({
      update: 'Completed review',
      date: '2026-09-12',
      categoryOptionId: 'category-id',
      typeOptionId: 'type-id',
      workModeOptionId: 'mode-id',
      projectId: 'project-id',
      jiraIds: ['jira-one', 'jira-two'],
      comment: '',
      wentWrong: '',
      appraisal: true,
    });
    await Promise.all([component.save(), component.save()]);
    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith('/api/work-logs', {
      update: 'Completed review',
      date: '2026-09-12',
      categoryOptionId: 'category-id',
      typeOptionId: 'type-id',
      workModeOptionId: 'mode-id',
      projectId: 'project-id',
      jiraIds: ['jira-one', 'jira-two'],
      comment: '',
      wentWrong: '',
      appraisal: true,
    });
  });
});
