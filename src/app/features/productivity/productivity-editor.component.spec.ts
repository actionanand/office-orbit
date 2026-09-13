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
