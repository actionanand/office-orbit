import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { ActivatedRoute, provideRouter } from '@angular/router';
import { of, Subject } from 'rxjs';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { Memo, Todo } from '../../shared/models/api.models';
import { ProductivityListPage } from './productivity-list.page';
import { ProductivityService } from './productivity.service';
import { TodoComputedService } from './todo-computed.service';
import { todoFixture } from './todo.fixture';
import { WorkCalendarComponent } from './work-calendar.component';
import { WorkCalendarService } from './work-calendar.service';

describe('ProductivityListPage bulk selection', () => {
  let bulkDelete: ReturnType<typeof vi.fn>;
  let snackbar: { success: ReturnType<typeof vi.fn>; error: ReturnType<typeof vi.fn> };
  let confirmation: { confirm: ReturnType<typeof vi.fn> };
  let workCalendar: { get: ReturnType<typeof vi.fn>; save: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    bulkDelete = vi.fn(() => of({ requested: 25, deleted: 25, failed: [], allSucceeded: true }));
    snackbar = { success: vi.fn(), error: vi.fn() };
    confirmation = { confirm: vi.fn(async () => true) };
    workCalendar = {
      get: vi.fn(() => of({ weekOffDays: ['Friday', 'Saturday'] })),
      save: vi.fn(() => of({ weekOffDays: ['Friday', 'Saturday'] })),
    };
    TestBed.configureTestingModule({
      imports: [ProductivityListPage],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { data: { kind: 'todos' } } } },
        {
          provide: TodoComputedService,
          useValue: {
            load: vi.fn(() =>
              of({
                data: [todoFixture({ status: 'Done', showToday: true, recurring: true, schedule: 'Daily' })],
                adjustments: {
                  todo: [{ scheduledDate: '2026-08-31', reminderDate: '2026-08-28', reason: 'Holiday + week off' }],
                },
                warnings: ['Holiday data may be incomplete'],
              }),
            ),
          },
        },
        {
          provide: ProductivityService,
          useValue: {
            list: vi.fn(() => of({ data: todos(26), count: 26, hasMore: false, nextCursor: null })),
            metadata: vi.fn(() => of({ resource: 'todos', fields: [] })),
            bulkDelete,
            patch: vi.fn(() => of({ data: todoFixture({ status: 'Done' }) })),
          },
        },
        { provide: SnackbarService, useValue: snackbar },
        { provide: ConfirmationService, useValue: confirmation },
        { provide: WorkCalendarService, useValue: workCalendar },
      ],
    });
  });

  it('keeps the work calendar mounted while its open input toggles', () => {
    const fixture = TestBed.createComponent(ProductivityListPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const calendar = fixture.debugElement.query(By.directive(WorkCalendarComponent))
      .componentInstance as WorkCalendarComponent;
    expect(calendar.open()).toBe(false);

    component.calendarOpen.set(true);
    fixture.detectChanges();
    expect(fixture.debugElement.query(By.directive(WorkCalendarComponent)).componentInstance).toBe(calendar);
    expect(calendar.open()).toBe(true);

    calendar.closed.emit();
    fixture.detectChanges();
    expect(component.calendarOpen()).toBe(false);
    expect(fixture.debugElement.query(By.directive(WorkCalendarComponent)).componentInstance).toBe(calendar);
    expect(calendar.open()).toBe(false);

    calendar.closed.emit();
    fixture.detectChanges();
    expect(component.calendarOpen()).toBe(false);
  });

  it('disables pin while saving, prevents duplicate requests, and shows the returned state', async () => {
    TestBed.overrideProvider(ActivatedRoute, { useValue: { snapshot: { data: { kind: 'memos' } } } });
    const memo: Memo = {
      id: 'memo',
      memo: 'Note',
      pinned: false,
      category: null,
      tags: [],
      createdTime: '',
      lastEditedTime: '',
    };
    const pending = new Subject<{ data: Memo }>();
    const patch = TestBed.inject(ProductivityService).patch as ReturnType<typeof vi.fn>;
    patch.mockReturnValue(pending);
    const fixture = TestBed.createComponent(ProductivityListPage);
    fixture.componentInstance.items.set([memo]);
    fixture.detectChanges();
    const saving = fixture.componentInstance.togglePin(memo);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('.memo-controls ion-button') as HTMLIonButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.querySelector('ion-spinner')).not.toBeNull();
    expect(fixture.componentInstance.items()[0]).toEqual(memo);
    await fixture.componentInstance.togglePin(memo);
    expect(patch).toHaveBeenCalledOnce();
    pending.next({ data: { ...memo, pinned: true } });
    pending.complete();
    await saving;
    fixture.detectChanges();
    expect(button.disabled).toBe(false);
    expect(button.querySelector('ion-spinner')).toBeNull();
    expect(button.querySelector('.memo-pin-icon')).not.toBeNull();
    expect(fixture.componentInstance.pinUpdatingIds()).toEqual([]);
  });

  it('restores the pin control after an error without changing the memo state', async () => {
    const memo: Memo = {
      id: 'memo',
      memo: 'Note',
      pinned: true,
      category: null,
      tags: [],
      createdTime: '',
      lastEditedTime: '',
    };
    const pending = new Subject<{ data: Memo }>();
    const patch = TestBed.inject(ProductivityService).patch as ReturnType<typeof vi.fn>;
    patch.mockReturnValue(pending);
    const component = TestBed.createComponent(ProductivityListPage).componentInstance;
    component.items.set([memo]);
    const saving = component.togglePin(memo);
    pending.error(new Error('Failed'));
    await saving;
    expect(component.pinUpdatingIds()).toEqual([]);
    expect(component.items()).toEqual([memo]);
    expect(snackbar.error).toHaveBeenCalledOnce();
  });

  it('closes through isOpen after save, reloads todos, and reopens with saved settings', async () => {
    const fixture = TestBed.createComponent(ProductivityListPage);
    const component = fixture.componentInstance;
    fixture.detectChanges();
    const calendar = fixture.debugElement.query(By.directive(WorkCalendarComponent))
      .componentInstance as WorkCalendarComponent;
    const response = new Subject<{ weekOffDays: ('Monday' | 'Sunday')[] }>();
    workCalendar.save.mockReturnValue(response);
    const reload = vi.spyOn(component, 'load');

    component.calendarOpen.set(true);
    fixture.detectChanges();
    calendar.choose(['Sunday', 'Monday']);
    const save = calendar.save();
    expect(calendar.saving()).toBe(true);
    expect(calendar.canDismiss()).toBe(false);

    response.next({ weekOffDays: ['Monday', 'Sunday'] });
    response.complete();
    await save;
    expect(calendar.saving()).toBe(false);
    expect(calendar.canDismiss()).toBe(true);
    expect(calendar.days()).toEqual(['Monday', 'Sunday']);
    expect(reload).toHaveBeenCalledWith(true);
    expect(component.calendarOpen()).toBe(false);

    fixture.detectChanges();
    expect(calendar.open()).toBe(false);
    expect(fixture.debugElement.query(By.directive(WorkCalendarComponent)).componentInstance).toBe(calendar);

    workCalendar.get.mockReturnValue(of({ weekOffDays: ['Monday', 'Sunday'] }));
    component.calendarOpen.set(true);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(calendar.open()).toBe(true);
    expect(calendar.days()).toEqual(['Monday', 'Sunday']);
  });

  it('allows selections 1 through 25, blocks item 26, and still permits deselection', () => {
    const fixture = TestBed.createComponent(ProductivityListPage);
    const component = fixture.componentInstance;
    for (let index = 0; index < 25; index += 1) {
      component.toggleSelection(`todo-${index}`);
      expect(component.selectedIds()).toHaveLength(index + 1);
    }
    component.toggleSelection('todo-25');
    expect(component.selectedIds()).toHaveLength(25);

    fixture.detectChanges();
    const checkboxes = fixture.nativeElement.querySelectorAll(
      '.selection-check ion-checkbox',
    ) as NodeListOf<HTMLIonCheckboxElement>;
    expect(checkboxes[0].disabled).toBe(false);
    expect(checkboxes[25].disabled).toBe(true);

    component.toggleSelection('todo-0');
    fixture.detectChanges();
    expect(component.selectedIds()).toHaveLength(24);
    expect(checkboxes[25].disabled).toBe(false);
  });

  it('selects only the first 25 visible items and explains the limit', () => {
    const component = TestBed.createComponent(ProductivityListPage).componentInstance;
    component.selectVisible();

    expect(component.selectedIds()).toEqual(todos(25).map(item => item.id));
    expect(snackbar.error).toHaveBeenCalledWith('Selected the first 25 items. Bulk delete is limited to 25.');
  });
  it('renders computed Today with adjusted reasons, Done styling, Ionic views, and recurrence text', () => {
    const fixture = TestBed.createComponent(ProductivityListPage),
      component = fixture.componentInstance;
    component.selectView('today');
    fixture.detectChanges();
    expect(TestBed.inject(TodoComputedService).load).toHaveBeenCalledWith('today', expect.any(String), '', false);
    expect(component.filters()).toEqual({ showToday: true });
    const root: HTMLElement = fixture.nativeElement;
    expect(root.querySelector('.productivity-row.completed')).not.toBeNull();
    expect(root.querySelector('.todo-recurrence-summary')?.textContent).toContain('Daily');
    expect(root.querySelector('.todo-reminder')?.textContent).toContain('Holiday + week off');
    expect(root.querySelectorAll('.todo-view-tabs ion-segment-button')).toHaveLength(9);
    expect(root.querySelector('.content-warning')?.textContent).toContain('incomplete');
    expect(component.hasMore()).toBe(false);
  });
  it('recomputes Today after an inline status change', async () => {
    const component = TestBed.createComponent(ProductivityListPage).componentInstance;
    component.selectView('today');
    component.metadata.set({
      resource: 'todos',
      fields: [
        {
          key: 'statusOptionId',
          label: 'Status',
          type: 'status',
          writable: true,
          options: [{ id: 'done', name: 'Done', color: '' }],
        },
      ],
    });
    await component.changeStatus(todoFixture(), 'done');
    expect(TestBed.inject(TodoComputedService).load).toHaveBeenLastCalledWith('today', expect.any(String), '', true);
  });

  it('guards invalid oversized deletion before confirmation or API invocation', async () => {
    const component = TestBed.createComponent(ProductivityListPage).componentInstance;
    component.selectedIds.set(todos(26).map(item => item.id));

    await component.deleteSelected();

    expect(confirmation.confirm).not.toHaveBeenCalled();
    expect(bulkDelete).not.toHaveBeenCalled();
    expect(snackbar.error).toHaveBeenCalledWith('Up to 25 items can be deleted at once.');
  });

  it('deletes exactly 25 and preserves partial-failure feedback', async () => {
    const component = TestBed.createComponent(ProductivityListPage).componentInstance;
    component.selectedIds.set(todos(25).map(item => item.id));
    await component.deleteSelected();
    expect(bulkDelete).toHaveBeenCalledWith(
      'todos',
      todos(25).map(item => item.id),
    );

    bulkDelete.mockReturnValueOnce(
      of({ requested: 2, deleted: 1, failed: [{ id: 'todo-1', deleted: false }], allSucceeded: false }),
    );
    component.selectedIds.set(['todo-0', 'todo-1']);
    await component.deleteSelected();
    expect(snackbar.error).toHaveBeenCalledWith('1 deleted, 1 could not be deleted.');
  });
});

function todos(count: number): Todo[] {
  return Array.from({ length: count }, (_, index) => ({
    ...todoFixture(),
    id: `todo-${index}`,
    createdTime: '',
    lastEditedTime: '',
    toDo: `Todo ${index}`,
    status: 'Not started',
    dueDate: null,
    notes: '',
  }));
}
