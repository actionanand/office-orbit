import { Todo } from '../../shared/models/api.models';

export function todoFixture(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo',
    createdTime: '',
    lastEditedTime: '',
    toDo: 'Reminder',
    status: 'Not started',
    dueDate: null,
    notes: '',
    schedule: null,
    repeatOn: [],
    interval: null,
    repeatDay: null,
    repeatMonth: null,
    monthEnd: null,
    repeatStart: null,
    workdayAdjust: false,
    recurring: false,
    showToday: false,
    setupIssue: '',
    ...overrides,
  };
}
