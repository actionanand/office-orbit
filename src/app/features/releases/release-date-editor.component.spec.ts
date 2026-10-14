import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { ReleaseBulkDateResponse } from '../../shared/models/api.models';
import { ReleaseService } from './releases.service';
import { ReleaseDateEditorComponent } from './release-date-editor.component';
import { AlterControlsService } from '../../core/management/alter-controls.service';

const response: ReleaseBulkDateResponse = {
  dateType: 'announcement',
  date: '2026-10-15',
  requested: 2,
  updated: 2,
  allSucceeded: true,
  data: [],
};

describe('ReleaseDateEditorComponent', () => {
  const releases = { bulkSetDate: vi.fn() };

  beforeEach(() => {
    releases.bulkSetDate.mockReset().mockReturnValue(of(response));
    TestBed.configureTestingModule({
      providers: [
        { provide: ReleaseService, useValue: releases },
        {
          provide: AlterControlsService,
          useValue: { alterReleaseManagementEnabled: signal(true), refresh: vi.fn().mockResolvedValue(null) },
        },
      ],
    });
  });

  function create() {
    const fixture = TestBed.createComponent(ReleaseDateEditorComponent);
    fixture.componentRef.setInput('dateType', 'announcement');
    fixture.componentRef.setInput('selectedIds', ['one', 'two']);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('prevents native form submission and delegates to the existing submit flow', () => {
    const component = create();
    const event = { preventDefault: vi.fn() } as unknown as Event;
    const submit = vi.spyOn(component, 'submit').mockResolvedValue();

    component.onSubmit(event);

    expect(event.preventDefault).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledOnce();
  });

  it('does not save an invalid date and keeps submit duplicate-safe while saving', async () => {
    const component = create();
    await component.submit();
    expect(releases.bulkSetDate).not.toHaveBeenCalled();

    component.form.setValue('2026-10-15');
    const pending = new Subject<ReleaseBulkDateResponse>();
    releases.bulkSetDate.mockReturnValue(pending);
    const first = component.submit();
    const second = component.submit();
    expect(component.saving()).toBe(true);
    expect(releases.bulkSetDate).toHaveBeenCalledTimes(1);
    pending.next(response);
    pending.complete();
    await Promise.all([first, second]);
    expect(component.saving()).toBe(false);
  });

  it('sends the selected IDs, date type, and selected date, then emits saved', async () => {
    const component = create();
    const saved = vi.fn();
    component.saved.subscribe(saved);
    component.form.setValue('2026-10-15');

    await component.submit();

    expect(releases.bulkSetDate).toHaveBeenCalledWith(['one', 'two'], 'announcement', '2026-10-15');
    expect(saved).toHaveBeenCalledWith(response);
  });

  it('emits failed and keeps the editor usable when the API request fails', async () => {
    const component = create();
    const failed = vi.fn();
    component.failed.subscribe(failed);
    component.form.setValue('2026-10-15');
    releases.bulkSetDate.mockReturnValue(throwError(() => ({ status: 500 })));

    await component.submit();

    expect(failed).toHaveBeenCalledWith({ status: 500 });
    expect(component.error()).toBe('Something went wrong. Please try again.');
    expect(component.saving()).toBe(false);
  });
});
