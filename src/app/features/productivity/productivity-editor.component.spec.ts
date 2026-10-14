import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { Task } from '../../shared/models/api.models';
import { MarkdownInputComponent } from '../../shared/components/markdown-input.component';
import { ProductivityEditorComponent } from './productivity-editor.component';
import { ProductivityService } from './productivity.service';

describe('ProductivityEditorComponent Task JIRAs', () => {
  it('updates draft selection and saves only JIRA page IDs', async () => {
    const task = taskFixture();
    const patch = vi.fn((_kind: string, _id: string, _body: unknown) => of({ data: task }));
    TestBed.configureTestingModule({
      imports: [ProductivityEditorComponent],
      providers: [
        { provide: ProductivityService, useValue: { patch } },
        { provide: RelationOptionsService, useValue: { load: vi.fn() } },
      ],
    });
    const fixture = TestBed.createComponent(ProductivityEditorComponent);
    fixture.componentRef.setInput('kind', 'tasks');
    fixture.componentRef.setInput('item', task);
    const component = fixture.componentInstance;
    component.form.controls.title.setValue(task.task);
    component.jirasChanged({
      ids: ['historical'],
      jiras: [{ id: 'historical', key: 'LSDEVOPS-7147', summary: 'Deploy the frontend' }],
    });

    await component.save();

    expect(component.form.controls.jiraIds.value).toEqual(['historical']);
    expect(component.selectedJiras()).toEqual([
      { id: 'historical', key: 'LSDEVOPS-7147', summary: 'Deploy the frontend' },
    ]);
    expect(patch).toHaveBeenCalledWith('tasks', task.id, expect.objectContaining({ jiraIds: ['historical'] }));
    expect(patch.mock.calls[0][2]).not.toHaveProperty('jiras');
  });

  it('keeps null Task dates blank and sends selected or cleared date values', async () => {
    const task = taskFixture();
    const patch = vi.fn((_kind: string, _id: string, _body: unknown) => of({ data: task }));
    const metadata = { resource: 'tasks', fields: [] };
    TestBed.configureTestingModule({
      imports: [ProductivityEditorComponent],
      providers: [
        { provide: ProductivityService, useValue: { metadata: vi.fn(() => of(metadata)), patch } },
        { provide: RelationOptionsService, useValue: { load: vi.fn(() => of([])) } },
      ],
    });
    const fixture = TestBed.createComponent(ProductivityEditorComponent);
    fixture.componentRef.setInput('kind', 'tasks');
    fixture.componentRef.setInput('item', task);
    const component = fixture.componentInstance;

    await component.load();
    expect(component.form.controls.dueDate.value).toBe('');
    expect(component.form.controls.followUpDate.value).toBe('');
    expect(component.form.controls.completedDate.value).toBe('');

    component.form.controls.dueDate.setValue('2026-09-13');
    component.form.controls.followUpDate.setValue('2026-09-14');
    component.form.controls.completedDate.setValue('2026-09-15');
    await component.save();
    expect(patch.mock.calls[0][2]).toEqual(
      expect.objectContaining({
        dueDate: '2026-09-13',
        followUpDate: '2026-09-14',
        completedDate: '2026-09-15',
      }),
    );

    component.form.controls.dueDate.setValue('');
    component.form.controls.followUpDate.setValue('');
    component.form.controls.completedDate.setValue('');
    await component.save();
    expect(patch.mock.calls[1][2]).toEqual(
      expect.objectContaining({ dueDate: null, followUpDate: null, completedDate: null }),
    );
  });
});

describe('ProductivityEditorComponent rich text fields', () => {
  const metadata = { resource: 'productivity', fields: [] };

  async function editor(kind: 'todos' | 'tasks' | 'memos') {
    TestBed.configureTestingModule({
      imports: [ProductivityEditorComponent],
      providers: [
        {
          provide: ProductivityService,
          useValue: {
            metadata: vi.fn(() => of(metadata)),
            create: vi.fn(() => of({ data: { id: 'created' } })),
            patch: vi.fn(() => of({ data: { id: 'updated' } })),
          },
        },
        { provide: RelationOptionsService, useValue: { load: vi.fn(() => of([])) } },
      ],
    });
    const fixture = TestBed.createComponent(ProductivityEditorComponent);
    fixture.componentRef.setInput('kind', kind);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.componentInstance.load();
    fixture.detectChanges();
    return fixture;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('uses the shared full editor for To Do Notes and preserves raw Markdown for saving', async () => {
    const fixture = await editor('todos');
    const inputs = fixture.debugElement.queryAll(By.directive(MarkdownInputComponent));
    expect(inputs).toHaveLength(1);
    const input = inputs[0].componentInstance as MarkdownInputComponent;
    expect(input.label()).toBe('Notes');
    expect(input.variant()).toBe('full');
    const source = '**Urgent**\n\n- Call support\n- [Open runbook](https://example.com)';
    fixture.componentInstance.form.controls.title.setValue('Review deployment');
    fixture.componentInstance.form.controls.notes.setValue(source);
    await fixture.componentInstance.save();
    expect(TestBed.inject(ProductivityService).create).toHaveBeenCalledWith(
      'todos',
      expect.objectContaining({ notes: source }),
    );
  });

  it('uses independent full editors for Task Notes and Outcome / Update', async () => {
    const fixture = await editor('tasks');
    const inputs = fixture.debugElement.queryAll(By.directive(MarkdownInputComponent));
    expect(inputs).toHaveLength(2);
    expect((inputs[0].componentInstance as MarkdownInputComponent).label()).toBe('Notes');
    expect((inputs[1].componentInstance as MarkdownInputComponent).label()).toBe('Outcome / Update');
    expect((inputs[0].componentInstance as MarkdownInputComponent).variant()).toBe('full');
    expect((inputs[1].componentInstance as MarkdownInputComponent).variant()).toBe('full');
    const notes = '- Reproduce issue\n- Gather logs';
    const outcome = 'Resolved with **configuration** update.';
    fixture.componentInstance.form.controls.title.setValue('Investigate deployment');
    fixture.componentInstance.form.controls.notes.setValue(notes);
    fixture.componentInstance.form.controls.outcomeUpdate.setValue(outcome);
    await fixture.componentInstance.save();
    expect(TestBed.inject(ProductivityService).create).toHaveBeenCalledWith(
      'tasks',
      expect.objectContaining({ notes, outcomeUpdate: outcome }),
    );
  });

  it('replaces the Memo-only editor with the shared full Markdown editor', async () => {
    const fixture = await editor('memos');
    const input = fixture.debugElement.query(By.directive(MarkdownInputComponent))
      .componentInstance as MarkdownInputComponent;
    expect(input.label()).toBe('Markdown');
    expect(input.variant()).toBe('full');
    const source = '# Deployment notes\n\n> Keep this pinned';
    fixture.componentInstance.form.controls.title.setValue('Release playbook');
    fixture.componentInstance.form.controls.markdown.setValue(source);
    await fixture.componentInstance.save();
    expect(TestBed.inject(ProductivityService).create).toHaveBeenCalledWith(
      'memos',
      expect.objectContaining({ markdown: source }),
    );
  });
});

function taskFixture(): Task {
  return {
    id: 'task',
    createdTime: '',
    lastEditedTime: '',
    task: 'Follow up deployment',
    status: 'Not started',
    priority: null,
    responsibility: null,
    requestedBy: '',
    requestedByType: null,
    assignedTo: '',
    assignedToType: null,
    dueDate: null,
    followUpDate: null,
    completedDate: null,
    companyIds: [],
    jiraIds: ['current'],
    notes: '',
    outcomeUpdate: '',
    jiras: [{ id: 'current', key: 'LSC-84944', summary: 'Angular upgrade' }],
  };
}
