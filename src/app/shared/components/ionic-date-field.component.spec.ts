import { TestBed } from '@angular/core/testing';
import { IonicDateFieldComponent } from './ionic-date-field.component';

describe('IonicDateFieldComponent', () => {
  afterEach(() => vi.useRealTimers());

  function create() {
    const fixture = TestBed.createComponent(IonicDateFieldComponent);
    fixture.componentRef.setInput('label', 'Due date');
    fixture.componentRef.setInput('controlId', 'due-date');
    fixture.detectChanges();
    return fixture;
  }

  it.each([null, ''] as const)('shows an explicit blank state for %s', value => {
    const fixture = create();
    fixture.componentInstance.writeValue(value);
    fixture.detectChanges();

    expect(fixture.componentInstance.value()).toBe('');
    expect(fixture.componentInstance.displayValue()).toBe('');
    const trigger = fixture.nativeElement.querySelector('.ionic-date-trigger') as HTMLButtonElement | null;
    expect(trigger?.textContent).toContain('Set date');
    expect(trigger?.getAttribute('aria-label')).toBe('Due date: Set date');
  });

  it('formats an existing date without changing its value', () => {
    const fixture = create();
    fixture.componentInstance.writeValue('2026-09-20');
    fixture.detectChanges();

    expect(fixture.componentInstance.displayValue()).toBe('Sep 20, 2026');
    expect(fixture.componentInstance.value()).toBe('2026-09-20');
  });

  it('commits a selected date only when Apply is pressed', () => {
    const component = create().componentInstance;
    const changed = vi.fn();
    const touched = vi.fn();
    component.registerOnChange(changed);
    component.registerOnTouched(touched);
    component.writeValue('');
    component.openPicker();
    component.draftChanged('2026-09-20T00:00:00');
    expect(changed).not.toHaveBeenCalled();

    component.apply();
    expect(changed).toHaveBeenCalledWith('2026-09-20');
    expect(touched).toHaveBeenCalledOnce();
    expect(component.value()).toBe('2026-09-20');
  });

  it('commits today from an initially blank picker when Apply is pressed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 8, 13, 12));
    const component = create().componentInstance;
    const changed = vi.fn();
    component.registerOnChange(changed);
    component.writeValue('');

    component.openPicker();
    expect(component.value()).toBe('');
    expect(component.draftValue()).toBe('2026-09-13');
    component.apply();

    expect(changed).toHaveBeenCalledWith('2026-09-13');
  });

  it('clears a value and leaves it unchanged on Cancel', () => {
    const component = create().componentInstance;
    const changed = vi.fn();
    component.registerOnChange(changed);
    component.writeValue('2026-09-20');
    component.openPicker();
    component.draftChanged('2026-10-01');
    component.cancel();
    expect(component.value()).toBe('2026-09-20');
    expect(changed).not.toHaveBeenCalled();

    component.openPicker();
    component.clear();
    expect(component.value()).toBe('');
    expect(changed).toHaveBeenCalledWith('');
  });

  it('disables the trigger and prevents opening the picker', () => {
    const fixture = create();
    fixture.componentInstance.setDisabledState(true);
    fixture.componentInstance.openPicker();
    fixture.detectChanges();

    expect(fixture.componentInstance.pickerOpen()).toBe(false);
    const trigger = fixture.nativeElement.querySelector('.ionic-date-trigger') as HTMLButtonElement | null;
    expect(trigger?.disabled).toBe(true);
  });
});
