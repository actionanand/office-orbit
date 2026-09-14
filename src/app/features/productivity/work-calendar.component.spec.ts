import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { WorkCalendarComponent } from './work-calendar.component';
import { WorkCalendarService } from './work-calendar.service';
import { WEEKDAYS } from './todo-recurrence';

describe('Work calendar UI', () => {
  const api = { get: vi.fn(), save: vi.fn() },
    snackbar = { success: vi.fn(), error: vi.fn() };
  beforeEach(() => {
    api.get.mockReset().mockReturnValue(of({ weekOffDays: ['Friday', 'Saturday'] }));
    api.save.mockReset().mockReturnValue(of({ weekOffDays: [] }));
    snackbar.success.mockClear();
    snackbar.error.mockClear();
    TestBed.configureTestingModule({
      providers: [
        { provide: WorkCalendarService, useValue: api },
        { provide: SnackbarService, useValue: snackbar },
      ],
    });
  });
  it('resets saving before success events and keeps the canonical response for reopening', async () => {
    const component = TestBed.createComponent(WorkCalendarComponent).componentInstance;
    await component.load();
    expect(api.get).toHaveBeenCalledWith(false);
    expect(component.days()).toEqual(['Friday', 'Saturday']);
    component.choose(['Sunday', 'Monday']);
    const response = new Subject<{ weekOffDays: ('Monday' | 'Sunday')[] }>();
    api.save.mockReturnValue(response);
    const events: string[] = [];
    const saved = vi.fn();
    const closed = vi.fn(() => expect(component.saving()).toBe(false));
    component.saved.subscribe(() => {
      events.push('saved');
      saved();
    });
    component.closed.subscribe(() => {
      events.push('closed');
      closed();
    });
    const save = component.save();
    expect(component.saving()).toBe(true);
    expect(component.canDismiss()).toBe(false);
    response.next({ weekOffDays: ['Monday', 'Sunday'] });
    response.complete();
    await save;
    expect(api.save).toHaveBeenCalledWith(['Sunday', 'Monday']);
    expect(component.days()).toEqual(['Monday', 'Sunday']);
    expect(component.saving()).toBe(false);
    expect(component.canDismiss()).toBe(true);
    expect(saved).toHaveBeenCalled();
    expect(closed).toHaveBeenCalled();
    expect(events).toEqual(['saved', 'closed']);
    expect(snackbar.success).toHaveBeenCalled();

    api.get.mockReturnValue(of({ weekOffDays: ['Monday', 'Sunday'] }));
    await component.load();
    expect(api.get).toHaveBeenLastCalledWith(false);
    expect(component.days()).toEqual(['Monday', 'Sunday']);
  });
  it('uses the live dismissal guard and closes normally from Cancel or X', () => {
    const component = TestBed.createComponent(WorkCalendarComponent).componentInstance;
    const closed = vi.fn();
    component.closed.subscribe(closed);

    component.requestClose();
    expect(closed).toHaveBeenCalledTimes(1);

    component.saving.set(true);
    component.requestClose();
    expect(closed).toHaveBeenCalledTimes(1);
    expect(component.canDismiss()).toBe(false);

    component.saving.set(false);
    component.requestClose();
    expect(closed).toHaveBeenCalledTimes(2);
    expect(component.canDismiss()).toBe(true);
  });
  it('blocks seven days and handles load/save failures', async () => {
    const component = TestBed.createComponent(WorkCalendarComponent).componentInstance;
    component.choose(WEEKDAYS);
    await component.save();
    expect(api.save).not.toHaveBeenCalled();
    api.get.mockReturnValue(throwError(() => new Error('offline')));
    await component.load();
    expect(component.loadError()).not.toBe('');
    component.choose(['Monday']);
    api.save.mockReturnValue(throwError(() => new Error('offline')));
    const closed = vi.fn();
    const saved = vi.fn();
    component.closed.subscribe(closed);
    component.saved.subscribe(saved);
    await component.save();
    expect(snackbar.error).toHaveBeenCalled();
    expect(closed).not.toHaveBeenCalled();
    expect(saved).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });
});
