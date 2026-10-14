import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { of, throwError } from 'rxjs';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { SprintAllocationPlanData, SprintDetailResponse } from '../../shared/models/api.models';
import { SprintBandwidthPlannerComponent } from './sprint-bandwidth-planner.component';
import { SprintService } from './sprints.service';

const detail: SprintDetailResponse = {
  sprint: {
    id: 'sprint-1',
    sprint: 'Sprint 8',
    active: true,
    startDate: '2026-10-14',
    endDate: '2026-10-27',
    weekOff1: 'Saturday',
    weekOff2: 'Sunday',
    plannedLeaveDays: 1,
    holidayDays: 1,
    capacityDays: 10,
    availableDays: 8,
    allocatedDays: 3.5,
    remainingDays: 4.5,
    projectIds: [],
    allocationIds: ['allocation-1', 'allocation-2'],
  },
  jiras: [
    {
      id: 'jira-1',
      jiraKey: 'LSC-86225',
      summary: 'SDD exploration',
      status: 'Not started',
      tags: [],
      spillover: false,
      spilloverCount: 0,
      plannedDays: 2.5,
      allocationId: 'allocation-1',
      allocationNotes: '',
      allocationConflict: false,
      allocationCount: 1,
    },
    {
      id: 'jira-2',
      jiraKey: 'LSC-86190',
      summary: 'Implementation',
      status: 'In progress',
      tags: [],
      spillover: true,
      spilloverCount: 1,
      plannedDays: null,
      allocationId: 'allocation-2',
      allocationNotes: '',
      allocationConflict: false,
      allocationCount: 1,
    },
  ],
  count: 2,
};

describe('SprintBandwidthPlannerComponent', () => {
  async function render(
    overrides: {
      plan?: ReturnType<typeof vi.fn>;
      enabled?: boolean;
      conflicts?: Array<{ jiraId: string; jiraKey: string; allocationCount: number }>;
      detail?: SprintDetailResponse;
    } = {},
  ) {
    const plan =
      overrides.plan ??
      vi.fn(() =>
        of({
          data: {
            sprintDetail: detail,
            summary: { availableDays: 8, allocatedDays: 3.5, remainingDays: 4.5, utilizationPercent: 43.75 },
            updatedAllocationIds: [],
            alreadySatisfiedAllocationIds: [],
          },
        }),
      );
    const controls = {
      alterSprintEnabled: signal(overrides.enabled ?? true),
      refresh: vi.fn().mockResolvedValue(null),
    };
    const confirmation = { confirm: vi.fn().mockResolvedValue(true) };
    const snackbar = { error: vi.fn(), success: vi.fn() };
    await TestBed.configureTestingModule({
      imports: [SprintBandwidthPlannerComponent],
      providers: [
        { provide: SprintService, useValue: { planCurrentSprintAllocations: plan } },
        { provide: AlterControlsService, useValue: controls },
        { provide: ConfirmationService, useValue: confirmation },
        { provide: SnackbarService, useValue: snackbar },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SprintBandwidthPlannerComponent);
    fixture.componentRef.setInput('detail', overrides.detail ?? detail);
    fixture.componentRef.setInput('conflicts', overrides.conflicts ?? []);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, plan, controls, confirmation, snackbar };
  }

  afterEach(() => TestBed.resetTestingModule());

  it('keeps draft values local, supports arbitrary non-negative decimals, and uses available capacity', async () => {
    const { component, plan } = await render();
    component.drafts.set({ 'jira-1': '0.25', 'jira-2': '3.75' });

    expect(component.draftAllocated()).toBe(4);
    expect(component.draftRemaining()).toBe(4);
    expect(component.draftProgress()).toBe(50);
    expect(component.canSave()).toBe(true);
    expect(plan).not.toHaveBeenCalled();

    component.drafts.set({ 'jira-1': '-1', 'jira-2': '0' });
    expect(component.canSave()).toBe(false);
  });

  it('updates the draft from Ionic ionInput values without requiring blur', async () => {
    const { component, fixture } = await render({
      detail: { ...detail, sprint: { ...detail.sprint, availableDays: 10 } },
    });
    const element = fixture.nativeElement as HTMLElement;
    const inputs = element.querySelectorAll<HTMLElement>('ion-input');

    inputs[0].dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value: '2' } }));
    inputs[1].dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value: '4' } }));
    fixture.detectChanges();

    expect(component.draftAllocated()).toBe(6);
    expect(component.draftRemaining()).toBe(4);
    expect(component.draftProgress()).toBe(60);
    expect(component.canSave()).toBe(true);

    inputs[0].dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value: '0.25' } }));
    fixture.detectChanges();
    expect(component.rows()[0].value).toBe(0.25);

    inputs[0].dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value: '' } }));
    fixture.detectChanges();
    expect(component.canSave()).toBe(false);

    inputs[0].dispatchEvent(new CustomEvent('ionInput', { bubbles: true, detail: { value: '-1' } }));
    fixture.detectChanges();
    expect(component.canSave()).toBe(false);
  });

  it('disables saving an unchanged or over-capacity plan and sends one batch for changed rows', async () => {
    const { component, plan } = await render();
    expect(component.canSave()).toBe(false);
    component.drafts.set({ 'jira-1': '7', 'jira-2': '2' });
    expect(component.overCapacity()).toBe(true);
    expect(component.canSave()).toBe(false);

    component.drafts.set({ 'jira-1': '2.5', 'jira-2': '1' });
    let saved: SprintAllocationPlanData | undefined;
    component.saved.subscribe(value => (saved = value));
    await component.save();

    expect(plan).toHaveBeenCalledTimes(1);
    expect(plan).toHaveBeenCalledWith({ allocations: [{ allocationId: 'allocation-2', plannedDays: 1 }] });
    expect(saved?.sprintDetail).toBe(detail);
    expect(saved?.summary).toMatchObject({ availableDays: 8, allocatedDays: 3.5, remainingDays: 4.5 });
  });

  it('does not submit conflict rows and keeps the draft after a capacity error', async () => {
    const plan = vi.fn(() =>
      throwError(() => ({ status: 409, error: { code: 'SPRINT_CAPACITY_EXCEEDED', data: { overBy: 1.5 } } })),
    );
    const { component, snackbar } = await render({
      plan,
      conflicts: [{ jiraId: 'jira-2', jiraKey: 'LSC-86190', allocationCount: 2 }],
    });
    component.drafts.set({ 'jira-1': '3', 'jira-2': '2' });
    await component.save();
    expect(plan).toHaveBeenCalledWith({ allocations: [{ allocationId: 'allocation-1', plannedDays: 3 }] });
    expect(component.error()).toContain('1.5');
    expect(component.drafts()['jira-1']).toBe('3');
    expect(snackbar.error).toHaveBeenCalled();
  });

  it('keeps the planner open when discarding changes is rejected and closes it when confirmed', async () => {
    const { component, confirmation } = await render();
    let cancelled = 0;
    component.cancelled.subscribe(() => (cancelled += 1));
    component.drafts.set({ 'jira-1': '3', 'jira-2': '0' });

    confirmation.confirm.mockResolvedValueOnce(false);
    await component.requestCancel();
    expect(cancelled).toBe(0);

    confirmation.confirm.mockResolvedValueOnce(true);
    await component.requestCancel();
    expect(cancelled).toBe(1);
  });

  it('retains the draft and refreshes controls when Alter Sprint expires', async () => {
    const plan = vi.fn(() => throwError(() => ({ status: 403, error: { code: 'ALTER_SPRINT_DISABLED' } })));
    const { component, controls, snackbar } = await render({ plan });
    component.drafts.set({ 'jira-1': '3', 'jira-2': '0' });

    await component.save();

    expect(controls.refresh).toHaveBeenCalledTimes(1);
    expect(component.drafts()['jira-1']).toBe('3');
    expect(component.error()).toContain('expired');
    expect(snackbar.error).toHaveBeenCalled();
  });
});
