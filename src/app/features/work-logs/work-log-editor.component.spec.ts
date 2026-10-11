import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { IonModal } from '@ionic/angular';
import { of } from 'rxjs';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { EditorModalStubComponent } from '../../shared/testing/editor-modal.stub';
import { workLogFixture } from '../../shared/models/work-log.fixture';
import { JiraPickerSelection } from '../jiras/jira-picker.component';
import { WorkLogEditorComponent } from './work-log-editor.component';

describe('WorkLogEditorComponent', () => {
  it('edits both Markdown notes as source while keeping Update and validation unchanged', async () => {
    const item = workLogFixture('existing', {
      comment: 'First paragraph\n\n- One\n- Two',
      wentWrong: 'A **pipeline** issue\n\nFollow-up',
      category: null,
      type: null,
      workMode: null,
    });
    const patch = vi.fn(() => of({ data: item }));
    const confirm = vi.fn().mockResolvedValue(false);
    TestBed.configureTestingModule({
      imports: [WorkLogEditorComponent],
      providers: [
        provideHttpClient(),
        { provide: MutationApiService, useValue: { metadata: () => of({ resource: 'work-logs', fields: [] }), patch } },
        { provide: RelationOptionsService, useValue: { load: () => of([]) } },
        { provide: ConfirmationService, useValue: { confirm } },
      ],
    }).overrideComponent(WorkLogEditorComponent, {
      remove: { imports: [IonModal] },
      add: { imports: [EditorModalStubComponent] },
    });
    const fixture = TestBed.createComponent(WorkLogEditorComponent);
    fixture.componentRef.setInput('item', item);
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const element: HTMLElement = fixture.nativeElement;
    const editors = element.querySelectorAll('app-markdown-input');
    expect(editors).toHaveLength(2);
    const textarea = editors[0].querySelector('textarea')!;
    expect(textarea.value).toBe(item.comment);
    expect(editors[1].querySelector('textarea')?.value).toBe(item.wentWrong);
    textarea.setSelectionRange(0, 5);
    editors[0].querySelector<HTMLButtonElement>('[aria-label="Italic"]')!.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.form.controls.comment.value).toBe('*First* paragraph\n\n- One\n- Two');
    expect(element.querySelector<HTMLInputElement>('#work-log-update')?.value).toBe(item.update);
    await fixture.componentInstance.requestClose();
    expect(confirm).toHaveBeenCalled();
    await fixture.componentInstance.save();
    expect(patch).toHaveBeenCalledWith(
      '/api/work-logs',
      'existing',
      expect.objectContaining({
        update: item.update,
        comment: '*First* paragraph\n\n- One\n- Two',
        wentWrong: item.wentWrong,
      }),
    );
    fixture.componentInstance.form.controls.update.setValue('');
    expect(fixture.componentInstance.canSave()).toBe(false);
  });

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
