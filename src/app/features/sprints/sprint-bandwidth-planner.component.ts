import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { IonButton, IonIcon, IonInput } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { saveOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { apiError, apiErrorCode } from '../../core/api/api-error';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import {
  SprintAllocationConflict,
  SprintAllocationPlanData,
  SprintDetailJira,
  SprintDetailResponse,
} from '../../shared/models/api.models';
import { formatDateRange } from '../../shared/utils/format';
import { spilloverLabel } from '../../shared/utils/jira';
import { SprintService } from './sprints.service';

interface DraftRow {
  jira: SprintDetailJira;
  value: number | null;
  invalid: boolean;
  conflict: SprintAllocationConflict | null;
}

@Component({
  selector: 'app-sprint-bandwidth-planner',
  imports: [IonButton, IonIcon, IonInput, StatusBadgeComponent],
  template: `<section class="sprint-bandwidth-planner" aria-labelledby="bandwidth-planner-heading">
    <header class="planner-header">
      <div>
        <span class="entity-kicker">Sprint bandwidth</span>
        <h2 id="bandwidth-planner-heading">{{ detail().sprint.sprint }}</h2>
        @if (dateRange(detail().sprint.startDate, detail().sprint.endDate)) {
          <p>{{ dateRange(detail().sprint.startDate, detail().sprint.endDate) }}</p>
        }
      </div>
      <ion-button fill="outline" [disabled]="saving()" (click)="requestCancel()">Cancel</ion-button>
    </header>

    <div class="planner-capacity" aria-live="polite">
      <span
        ><small>Capacity</small><strong>{{ detail().sprint.capacityDays }}</strong></span
      >
      <span
        ><small>Available</small><strong>{{ detail().sprint.availableDays }}</strong></span
      >
      <span
        ><small>Draft allocated</small><strong>{{ draftAllocated() }}</strong></span
      >
      <span
        ><small>Draft remaining</small
        ><strong [class.over-capacity-value]="overCapacity()">{{ draftRemaining() }}</strong></span
      >
    </div>
    <div
      class="progress-track capacity-progress planner-progress"
      role="progressbar"
      aria-label="Draft Sprint capacity allocated"
      aria-valuemin="0"
      aria-valuemax="100"
      [attr.aria-valuenow]="draftProgress()">
      <span [class.over-capacity-fill]="overCapacity()" [style.width.%]="draftProgress()"></span>
    </div>
    @if (overCapacity()) {
      <p class="form-error planner-alert" role="alert">Over capacity by {{ overBy() }} days</p>
    }
    @if (error()) {
      <p class="form-error planner-alert" role="alert">{{ error() }}</p>
    }

    <div class="planner-rows">
      @for (row of rows(); track row.jira.id) {
        <article class="planner-row" [class.planner-row-conflict]="row.conflict || row.jira.allocationConflict">
          <div class="planner-jira-copy">
            <span class="entity-kicker">{{ row.jira.jiraKey }}</span>
            <strong>{{ row.jira.summary || 'JIRA' }}</strong>
            <span class="badge-line">
              @if (row.jira.status) {
                <app-status-badge [label]="row.jira.status" kind="jira-status" />
              }
              @if (row.jira.spilloverCount > 0) {
                <app-status-badge [label]="spilled(row.jira.spilloverCount)" />
              }
            </span>
            @if (row.conflict || row.jira.allocationConflict) {
              <span class="allocation-warning"
                ><strong>Allocation conflict</strong>
                @if ((row.conflict?.allocationCount ?? row.jira.allocationCount) > 0) {
                  · {{ row.conflict?.allocationCount ?? row.jira.allocationCount }} records
                }
              </span>
            }
          </div>
          <div class="planner-input">
            <ion-input
              [id]="'planned-days-' + row.jira.id"
              label="Planned Days"
              labelPlacement="stacked"
              fill="outline"
              type="number"
              min="0"
              step="0.5"
              inputmode="decimal"
              [value]="draftValue(row.jira)"
              [disabled]="row.conflict !== null || row.jira.allocationConflict || !row.jira.allocationId || saving()"
              [attr.aria-label]="'Planned Days for ' + row.jira.jiraKey"
              (ionInput)="draftChanged(row.jira, $event)" />
            @if (row.invalid) {
              <span class="field-validation" role="alert">Enter a non-negative number.</span>
            }
          </div>
        </article>
      }
    </div>

    <footer class="planner-actions">
      <ion-button fill="clear" [disabled]="saving()" (click)="requestCancel()">Cancel</ion-button>
      <ion-button type="button" [disabled]="!canSave()" (click)="save()">
        <ion-icon name="save-outline" slot="start" />{{ saving() ? 'Saving…' : 'Save plan' }}
      </ion-button>
    </footer>
  </section>`,
})
export class SprintBandwidthPlannerComponent {
  readonly detail = input.required<SprintDetailResponse>();
  readonly conflicts = input<SprintAllocationConflict[]>([]);
  readonly saved = output<SprintAllocationPlanData>();
  readonly cancelled = output<void>();
  readonly drafts = signal<Record<string, string>>({});
  readonly saving = signal(false);
  readonly error = signal('');
  readonly dateRange = formatDateRange;
  readonly spilled = spilloverLabel;
  readonly controls = inject(AlterControlsService);
  private readonly service = inject(SprintService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly snackbar = inject(SnackbarService);

  readonly conflictByJira = computed(
    () => new Map(this.conflicts().map(conflict => [conflict.jiraId, conflict] as const)),
  );
  readonly rows = computed<DraftRow[]>(() =>
    this.detail().jiras.map(jira => {
      const raw = this.draftValue(jira).trim();
      const value = raw === '' ? null : Number(raw);
      return {
        jira,
        value,
        invalid: value === null || !Number.isFinite(value) || value < 0,
        conflict: this.conflictByJira().get(jira.id) ?? null,
      };
    }),
  );
  readonly draftAllocated = computed(() =>
    this.rows().reduce(
      (total, row) => total + (row.invalid || row.conflict || row.jira.allocationConflict ? 0 : row.value!),
      0,
    ),
  );
  readonly draftRemaining = computed(() => this.round(this.detail().sprint.availableDays - this.draftAllocated()));
  readonly overCapacity = computed(() => this.draftAllocated() > this.detail().sprint.availableDays);
  readonly overBy = computed(() => this.round(Math.max(0, this.draftAllocated() - this.detail().sprint.availableDays)));
  readonly draftProgress = computed(() => {
    const available = this.detail().sprint.availableDays;
    return available > 0 ? Math.min(100, Math.max(0, (this.draftAllocated() / available) * 100)) : 0;
  });
  readonly changedAllocations = computed(() =>
    this.rows()
      .filter(row => !row.invalid && !row.conflict && !row.jira.allocationConflict && row.jira.allocationId)
      .filter(row => Math.abs(row.value! - (row.jira.plannedDays ?? 0)) > 0.000001)
      .map(row => ({ allocationId: row.jira.allocationId!, plannedDays: row.value! })),
  );
  readonly canSave = computed(
    () =>
      this.controls.alterSprintEnabled() &&
      !this.saving() &&
      !this.overCapacity() &&
      !this.rows().some(row => row.invalid) &&
      this.changedAllocations().length > 0,
  );

  constructor() {
    addIcons({ saveOutline });
    effect(() => {
      const detail = this.detail();
      this.drafts.set(Object.fromEntries(detail.jiras.map(jira => [jira.id, String(jira.plannedDays ?? 0)])));
      this.error.set('');
    });
  }

  draftValue(jira: SprintDetailJira): string {
    return this.drafts()[jira.id] ?? String(jira.plannedDays ?? 0);
  }

  draftChanged(jira: SprintDetailJira, event: Event): void {
    const value = event.target instanceof HTMLIonInputElement ? event.target.value : '';
    this.drafts.update(drafts => ({ ...drafts, [jira.id]: String(value ?? '') }));
  }

  async requestCancel(): Promise<void> {
    if (this.saving()) return;
    if (this.changedAllocations().length === 0 && !this.rows().some(row => row.invalid)) {
      this.cancelled.emit();
      return;
    }
    const discard = await this.confirmation.confirm({
      title: 'Discard bandwidth changes?',
      message: 'Your unsaved Planned Days changes will be lost.',
      confirmLabel: 'Discard',
      danger: true,
    });
    if (discard) this.cancelled.emit();
  }

  async save(): Promise<void> {
    if (!this.canSave()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(
        this.service.planCurrentSprintAllocations({ allocations: this.changedAllocations() }),
      );
      this.saved.emit(response.data);
    } catch (error) {
      await this.handleSaveError(error);
    } finally {
      this.saving.set(false);
    }
  }

  private async handleSaveError(error: unknown): Promise<void> {
    const code = apiErrorCode(error);
    if (code === 'ALTER_SPRINT_DISABLED') {
      await this.controls.refresh().catch(() => undefined);
      this.showError('Alter Sprint has expired. Enable it again in Settings.');
      return;
    }
    if (code === 'SPRINT_CAPACITY_EXCEEDED') {
      const detail = this.capacityError(error instanceof HttpErrorResponse ? error.error : error);
      this.showError(`Sprint plan exceeds available capacity by ${detail?.overBy ?? this.overBy()} days.`);
      return;
    }
    if (code === 'ACTIVE_SPRINT_NOT_FOUND') return this.showError('No active Sprint is configured.');
    if (code === 'ACTIVE_SPRINT_CONFLICT') return this.showError('Multiple active Sprints are configured.');
    if (code === 'SPRINT_ALLOCATION_CONFLICT')
      return this.showError('One or more Sprint allocations need to be fixed before planning.');
    if (code === 'SPRINT_PLAN_PARTIAL')
      return this.showError('Part of the Sprint plan may have been saved. Refresh and review the allocations.');
    this.showError(apiError(error));
  }

  private capacityError(value: unknown): { overBy: number } | null {
    if (typeof value !== 'object' || value === null) return null;
    const nested = 'error' in value && typeof value.error === 'object' && value.error !== null ? value.error : value;
    const data = typeof nested === 'object' && nested !== null && 'data' in nested ? nested.data : nested;
    if (typeof data !== 'object' || data === null || !('overBy' in data) || typeof data.overBy !== 'number')
      return null;
    return { overBy: data.overBy };
  }

  private showError(message: string): void {
    this.error.set(message);
    this.snackbar.error(message);
  }

  private round(value: number): number {
    return Math.round(value * 1000) / 1000;
  }
}
