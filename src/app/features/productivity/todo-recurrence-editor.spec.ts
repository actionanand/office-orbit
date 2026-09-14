import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { ResourceMetadataResponse, Todo } from '../../shared/models/api.models';
import { ProductivityEditorComponent } from './productivity-editor.component';
import { ProductivityService } from './productivity.service';
import { todoFixture } from './todo.fixture';
import { createRecurrenceForm, normalizeRecurrence, recurrenceValidation } from './todo-recurrence-form';
import { MONTHS, WEEKDAYS } from './todo-recurrence';

const metadata: ResourceMetadataResponse = {
  resource: 'todos',
  fields: Object.entries({
    scheduleOptionId: ['Daily', 'Weekly', 'Monthly', 'Yearly'],
    repeatOnOptionIds: WEEKDAYS,
    repeatMonthOptionId: MONTHS,
    monthEndOptionId: ['Last day', 'Day before last day'],
    statusOptionId: ['Not started', 'Done'],
  }).map(([key, names]) => ({
    key,
    label: key,
    type: 'select',
    writable: true,
    options: names.map(name => ({ id: `id:${name}`, name, color: '' })),
  })),
};
describe('Todo recurrence editor', () => {
  const create = vi.fn(),
    patch = vi.fn();
  beforeEach(() => {
    create.mockReset().mockReturnValue(of({ data: todoFixture() }));
    patch.mockReset().mockReturnValue(of({ data: todoFixture() }));
    TestBed.configureTestingModule({
      imports: [ProductivityEditorComponent],
      providers: [
        { provide: ProductivityService, useValue: { metadata: () => of(metadata), create, patch } },
        { provide: RelationOptionsService, useValue: {} },
      ],
    });
  });
  async function editor(todo: Todo | null = null) {
    const fixture = TestBed.createComponent(ProductivityEditorComponent);
    fixture.componentRef.setInput('kind', 'todos');
    fixture.componentRef.setInput('item', todo);
    await fixture.componentInstance.load();
    fixture.componentInstance.form.controls.title.setValue('Recurring report');
    return fixture.componentInstance;
  }
  it('maps existing names back to live metadata IDs and never writes computed fields', async () => {
    const component = await editor(
      todoFixture({
        recurring: true,
        schedule: 'Weekly',
        repeatOn: ['Tuesday', 'Friday'],
        workdayAdjust: true,
        setupIssue: 'Review settings',
      }),
    );
    expect(component.form.controls.recurrence.controls.repeatOnOptionIds.value).toEqual(['id:Tuesday', 'id:Friday']);
    expect(component.setupIssue()).toBe('Review settings');
    await component.save();
    const body = patch.mock.calls[0][2];
    expect(body).toMatchObject({
      scheduleOptionId: 'id:Weekly',
      repeatOnOptionIds: ['id:Tuesday', 'id:Friday'],
      workdayAdjust: true,
      dueDate: null,
    });
    for (const key of ['recurring', 'showToday', 'setupIssue', 'monthlyTiming']) expect(body).not.toHaveProperty(key);
  });
  it('clears Due Date immediately, cleans incompatible controls and restores normal scheduling', async () => {
    const component = await editor();
    const form = component.form.controls.recurrence;
    component.form.controls.dueDate.setValue('2026-09-15');
    form.patchValue({
      scheduleOptionId: 'id:Weekly',
      repeatOnOptionIds: ['id:Tuesday'],
      interval: 2,
      repeatStart: '2026-09-14',
      workdayAdjust: true,
    });
    expect(component.form.controls.dueDate.value).toBe('');
    form.controls.scheduleOptionId.setValue('id:Monthly');
    expect(form.getRawValue()).toMatchObject({ repeatOnOptionIds: [], interval: null, repeatStart: '' });
    form.controls.scheduleOptionId.setValue('');
    expect(form.controls.workdayAdjust.value).toBe(false);
    component.form.controls.dueDate.setValue('2026-10-01');
    await component.save();
    expect(create.mock.calls[0][1]).toMatchObject({
      scheduleOptionId: null,
      dueDate: '2026-10-01',
      workdayAdjust: false,
    });
  });
  it.each([
    [
      { scheduleOptionId: 'id:Monthly', repeatDay: 15 },
      { repeatDay: 15, monthEndOptionId: null },
    ],
    [
      { scheduleOptionId: 'id:Monthly', monthlyTiming: 'end', monthEndOptionId: 'id:Last day', repeatDay: 15 },
      { repeatDay: null, monthEndOptionId: 'id:Last day' },
    ],
    [
      { scheduleOptionId: 'id:Yearly', repeatMonthOptionId: 'id:December', repeatDay: 25 },
      { repeatMonthOptionId: 'id:December', repeatDay: 25 },
    ],
  ])('writes only the selected timing %j', async (value, expected) => {
    const component = await editor();
    component.form.controls.recurrence.patchValue(value);
    await component.save();
    expect(create.mock.calls[0][1]).toMatchObject(expected);
  });
  it('blocks invalid forms before calling the API', async () => {
    const component = await editor();
    component.form.controls.recurrence.controls.scheduleOptionId.setValue('id:Weekly');
    await component.save();
    expect(create).not.toHaveBeenCalled();
    expect(component.saveError()).toContain('Repeat On');
  });
  it.each([
    [{ scheduleOptionId: 'id:Daily', interval: 0 }, 'Interval'],
    [{ scheduleOptionId: 'id:Daily', interval: 1.5 }, 'Interval'],
    [{ scheduleOptionId: 'id:Daily', interval: 2 }, 'Repeat Start'],
    [{ scheduleOptionId: 'id:Monthly' }, 'Repeat Day'],
    [{ scheduleOptionId: 'id:Monthly', repeatDay: 32 }, 'Repeat Day'],
    [{ scheduleOptionId: 'id:Monthly', monthlyTiming: 'end' }, 'Month End'],
    [{ scheduleOptionId: 'id:Yearly', repeatDay: 1 }, 'Repeat Month'],
    [{ scheduleOptionId: 'id:Yearly', repeatMonthOptionId: 'id:February', repeatDay: 29 }, '28'],
    [{ scheduleOptionId: 'id:Yearly', repeatMonthOptionId: 'id:April', repeatDay: 31 }, '30'],
  ])('validates %j', (value, error) => {
    const form = createRecurrenceForm();
    form.patchValue(value);
    normalizeRecurrence(form, metadata);
    expect(recurrenceValidation(form.getRawValue(), metadata)).toContain(error);
  });
  it('clears Repeat Start for empty/one interval', () => {
    const form = createRecurrenceForm();
    form.patchValue({ scheduleOptionId: 'id:Daily', interval: 1, repeatStart: '2026-09-14' });
    normalizeRecurrence(form, metadata);
    expect(form.controls.repeatStart.value).toBe('');
  });
});
