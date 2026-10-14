import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { IonModal } from '@ionic/angular';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { SprintAllocationPatchData, SprintDetailJira, SprintDetailResponse } from '../../shared/models/api.models';
import { EditorModalStubComponent } from '../../shared/testing/editor-modal.stub';
import { SprintPlannedDaysEditorComponent } from './sprint-planned-days-editor.component';
import { SprintService } from './sprints.service';

const jira: SprintDetailJira = {
  id: 'jira-1',
  jiraKey: 'LSC-1',
  summary: 'Plan allocation',
  status: 'Not started',
  tags: [],
  spillover: false,
  spilloverCount: 0,
  plannedDays: 1,
  allocationId: 'allocation-1',
  allocationNotes: '',
  allocationConflict: false,
  allocationCount: 1,
};

const sprintDetail: SprintDetailResponse = {
  sprint: {
    id: 'sprint-1',
    sprint: 'Sprint 1',
    active: true,
    startDate: null,
    endDate: null,
    weekOff1: null,
    weekOff2: null,
    plannedLeaveDays: 0,
    holidayDays: 0,
    capacityDays: 10,
    availableDays: 10,
    allocatedDays: 1,
    remainingDays: 9,
    projectIds: [],
    allocationIds: ['allocation-1'],
  },
  jiras: [jira],
  count: 1,
};

const response: SprintAllocationPatchData = {
  allocation: {
    id: 'allocation-1',
    allocation: 'LSC-1',
    plannedDays: 2.25,
    notes: '',
    sprintIds: ['sprint-1'],
    jiraIds: ['jira-1'],
    sprintActive: true,
    spillReason: '',
    spilled: false,
    sprintStart: null,
    firstSprintStart: null,
  },
  sprintDetail,
};

describe('SprintPlannedDaysEditorComponent', () => {
  async function render(updatePlannedDays = vi.fn(() => of({ data: response }))) {
    const controls = { alterSprintEnabled: signal(true), refresh: vi.fn().mockResolvedValue(null) };
    await TestBed.configureTestingModule({
      imports: [SprintPlannedDaysEditorComponent],
      providers: [
        { provide: SprintService, useValue: { updatePlannedDays } },
        { provide: AlterControlsService, useValue: controls },
        { provide: SnackbarService, useValue: { error: vi.fn() } },
      ],
    })
      .overrideComponent(SprintPlannedDaysEditorComponent, {
        remove: { imports: [IonModal] },
        add: { imports: [EditorModalStubComponent] },
      })
      .compileComponents();
    const fixture = TestBed.createComponent(SprintPlannedDaysEditorComponent);
    fixture.componentRef.setInput('open', true);
    fixture.componentRef.setInput('jira', jira);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, controls, updatePlannedDays };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('uses a reactive form and prevents native submission while saving once', async () => {
    const { component, fixture, updatePlannedDays } = await render();
    let saved: SprintAllocationPatchData | undefined;
    component.saved.subscribe(value => (saved = value));
    component.form.controls.plannedDays.setValue(2.25);

    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;
    const submit = new Event('submit', { bubbles: true, cancelable: true });
    form.dispatchEvent(submit);
    await Promise.resolve();

    expect(component.form.controls.plannedDays.value).toBe(2.25);
    expect(submit.defaultPrevented).toBe(true);
    expect(updatePlannedDays).toHaveBeenCalledTimes(1);
    expect(updatePlannedDays).toHaveBeenCalledWith('allocation-1', 2.25);
    expect(saved).toBe(response);
  });

  it('does not save invalid values and prevents duplicate requests while saving', async () => {
    const pending = new Subject<{ data: SprintAllocationPatchData }>();
    const updatePlannedDays = vi.fn(() => pending.asObservable());
    const { component } = await render(updatePlannedDays);

    component.form.controls.plannedDays.setValue(null);
    await component.save();
    expect(updatePlannedDays).not.toHaveBeenCalled();

    component.form.controls.plannedDays.setValue(0.25);
    void component.save();
    void component.save();
    expect(updatePlannedDays).toHaveBeenCalledTimes(1);
    pending.next({ data: response });
    pending.complete();
  });

  it('keeps the editor open on API errors and refreshes controls when Alter Sprint expires', async () => {
    const updatePlannedDays = vi.fn(() =>
      throwError(() => new HttpErrorResponse({ status: 403, error: { code: 'ALTER_SPRINT_DISABLED' } })),
    );
    const { component, controls } = await render(updatePlannedDays);
    let closed = 0;
    component.closed.subscribe(() => (closed += 1));
    component.form.controls.plannedDays.setValue(4.75);

    await component.save();

    expect(controls.refresh).toHaveBeenCalledTimes(1);
    expect(component.error()).toContain('expired');
    expect(closed).toBe(0);
  });
});
