import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { Task } from '../../shared/models/api.models';
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
