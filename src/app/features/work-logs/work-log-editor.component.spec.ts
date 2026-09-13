import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { workLogFixture } from '../../shared/models/work-log.fixture';
import { JiraPickerSelection } from '../jiras/jira-picker.component';
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

  it('loads projects without preloading all JIRAs and preserves an existing historical selection', async () => {
    const historical = {
      ...workLogFixture('existing'),
      jiraIds: ['historical'],
      jiras: [{ id: 'historical', key: 'LSDEVOPS-7147', summary: 'Old deployment' }],
    };
    const metadata = vi.fn(() => of({ resource: 'work-logs', fields: [] }));
    const load = vi.fn(() => of([]));
    TestBed.configureTestingModule({
      imports: [WorkLogEditorComponent],
      providers: [
        { provide: MutationApiService, useValue: { metadata, create: vi.fn(), patch: vi.fn() } },
        { provide: RelationOptionsService, useValue: { load } },
      ],
    });
    const fixture = TestBed.createComponent(WorkLogEditorComponent);
    fixture.componentRef.setInput('item', historical);

    await fixture.componentInstance.load();

    expect(load).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledWith('/api/projects/active', false);
    expect(load).not.toHaveBeenCalledWith('/api/jiras', expect.anything());
    expect(fixture.componentInstance.form.controls.jiraIds.value).toEqual(['historical']);
    expect(fixture.componentInstance.selectedJiras()).toEqual(historical.jiras);
  });

  it('applies picker IDs and presentation details to the Work Log form', () => {
    TestBed.configureTestingModule({
      imports: [WorkLogEditorComponent],
      providers: [
        { provide: MutationApiService, useValue: { create: vi.fn(), patch: vi.fn() } },
        { provide: RelationOptionsService, useValue: {} },
      ],
    });
    const component = TestBed.createComponent(WorkLogEditorComponent).componentInstance;
    const selection: JiraPickerSelection = {
      ids: ['jira-one'],
      jiras: [{ id: 'jira-one', key: 'LSC-84944', summary: 'Angular upgrade' }],
    };

    component.jirasChanged(selection);

    expect(component.form.controls.jiraIds.value).toEqual(['jira-one']);
    expect(component.form.controls.jiraIds.dirty).toBe(true);
    expect(component.selectedJiras()).toEqual(selection.jiras);
  });
});
