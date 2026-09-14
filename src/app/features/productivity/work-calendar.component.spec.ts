import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
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
  it('loads current settings, accepts none, and emits a save notification', async () => {
    const component = TestBed.createComponent(WorkCalendarComponent).componentInstance;
    await component.load();
    expect(component.days()).toEqual(['Friday', 'Saturday']);
    component.choose([]);
    const saved = vi.fn();
    component.saved.subscribe(saved);
    await component.save();
    expect(api.save).toHaveBeenCalledWith([]);
    expect(saved).toHaveBeenCalled();
    expect(snackbar.success).toHaveBeenCalled();
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
    await component.save();
    expect(snackbar.error).toHaveBeenCalled();
    expect(component.saving()).toBe(false);
  });
});
