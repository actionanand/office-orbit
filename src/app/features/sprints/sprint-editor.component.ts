import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { RelationOption, Sprint, SprintCreateRequest, Weekday } from '../../shared/models/api.models';
import { WorkCalendarService } from '../productivity/work-calendar.service';
import { SprintService } from './sprints.service';

export function addCalendarDays(date: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!match) return '';
  const value = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

@Component({
  selector: 'app-sprint-editor',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
  ],
  template: `<ion-modal
    class="editor-modal"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didPresent)="focusFirst()"
    (didDismiss)="closed.emit()">
    <ng-template>
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ item() ? 'Edit Sprint' : 'Create Sprint' }}</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close Sprint editor"
            [disabled]="submitting()"
            (click)="requestClose()">
            <ion-icon name="close-outline" slot="icon-only" />
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        @if (loading()) {
          <div class="editor-state" role="status">Loading Sprint options…</div>
        } @else if (loadError()) {
          <div class="editor-state" role="alert">
            <p>{{ loadError() }}</p>
            <ion-button fill="outline" (click)="load(true)"
              ><ion-icon name="refresh-outline" slot="start" />Retry</ion-button
            >
          </div>
        } @else {
          <form class="editor-form" [formGroup]="form" (ngSubmit)="save()">
            @if (!item()) {
              <div class="field-span editor-context" aria-live="polite">
                <strong>Currently active</strong>
                @if (activeSprints().length === 0) {
                  <span>No active Sprint</span>
                } @else {
                  @for (sprint of activeSprints(); track sprint.id) {
                    <span>{{ sprint.sprint }}</span>
                  }
                }
                @if (activeSprints().length > 1) {
                  <p class="form-warning" role="alert">Multiple active Sprints are currently configured.</p>
                }
              </div>
            }
            <ion-input
              #firstField
              label="Sprint"
              labelPlacement="stacked"
              fill="outline"
              formControlName="sprint"
              required />
            <ion-select
              label="Project"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="projectId"
              required>
              <ion-select-option value="">Choose a project</ion-select-option>
              @for (project of projects(); track project.id) {
                <ion-select-option [value]="project.id">{{ project.label }}</ion-select-option>
              }
            </ion-select>
            <ion-input
              label="Start Date"
              labelPlacement="stacked"
              fill="outline"
              type="date"
              formControlName="startDate"
              required />
            <ion-input
              label="End Date"
              labelPlacement="stacked"
              fill="outline"
              type="date"
              formControlName="endDate"
              required />
            <ion-input
              label="Planned Leave Days"
              labelPlacement="stacked"
              fill="outline"
              type="number"
              min="0"
              step="0.5"
              formControlName="plannedLeaveDays"
              required />
            <ion-input
              label="Holiday Days"
              labelPlacement="stacked"
              fill="outline"
              type="number"
              min="0"
              step="0.5"
              formControlName="holidayDays"
              required />
            <div class="field-span editor-context">
              <strong>Week offs</strong>
              <span>{{ weekOffLabel() }}</span>
              <small>Managed from Work Calendar settings.</small>
              @if (weekOffDays().length > 2) {
                <p class="form-warning" role="alert">
                  Sprint configuration supports at most two week-off days. Update Work Calendar before saving this
                  Sprint.
                </p>
              }
            </div>
            @if (!item()) {
              <ion-checkbox class="field-span" formControlName="makeActive">Make this Sprint active</ion-checkbox>
            }
            @if (saveError()) {
              <p class="form-error field-span" role="alert">{{ saveError() }}</p>
            }
            <div class="editor-actions field-span">
              <ion-button type="button" fill="clear" [disabled]="submitting()" (click)="requestClose()"
                >Cancel</ion-button
              >
              <ion-button
                type="submit"
                [disabled]="form.invalid || weekOffDays().length > 2 || submitting() || !controls.alterSprintEnabled()">
                <ion-icon name="save-outline" slot="start" />{{ submitting() ? 'Saving…' : 'Save' }}
              </ion-button>
            </div>
          </form>
        }
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class SprintEditorComponent {
  readonly open = input(false);
  readonly item = input<Sprint | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Sprint>();
  readonly projects = signal<RelationOption[]>([]);
  readonly activeSprints = signal<Sprint[]>([]);
  readonly weekOffDays = signal<Weekday[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly submitting = signal(false);
  readonly firstField = viewChild<IonInput>('firstField');
  readonly form = new FormGroup({
    sprint: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    projectId: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    startDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    endDate: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    plannedLeaveDays: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    holidayDays: new FormControl(0, { nonNullable: true, validators: [Validators.required, Validators.min(0)] }),
    makeActive: new FormControl(false, { nonNullable: true }),
  });
  private readonly api = inject(SprintService);
  private readonly relations = inject(RelationOptionsService);
  private readonly calendar = inject(WorkCalendarService);
  readonly controls = inject(AlterControlsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly snackbar = inject(SnackbarService);
  private startSubscription?: { unsubscribe(): void };
  readonly canDismiss = () => this.confirmClose();

  constructor() {
    addIcons({ closeOutline, refreshOutline, saveOutline });
    effect(() => {
      if (this.open()) void this.load();
    });
  }

  weekOffLabel(): string {
    return this.weekOffDays().join(', ') || 'None';
  }

  async load(refresh = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    try {
      const [projects, calendar, active] = await Promise.all([
        firstValueFrom(this.relations.load('/api/projects', refresh)),
        firstValueFrom(this.calendar.get(refresh)),
        firstValueFrom(this.api.active(refresh)),
      ]);
      this.projects.set(projects);
      this.weekOffDays.set(calendar.weekOffDays);
      this.activeSprints.set(active.data);
      const item = this.item();
      this.form.reset({
        sprint: item?.sprint ?? '',
        projectId: item?.projectIds[0] ?? '',
        startDate: item?.startDate ?? '',
        endDate: item?.endDate ?? '',
        plannedLeaveDays: item?.plannedLeaveDays ?? 0,
        holidayDays: item?.holidayDays ?? 0,
        makeActive: false,
      });
      this.startSubscription?.unsubscribe();
      if (!item) {
        this.startSubscription = this.form.controls.startDate.valueChanges.subscribe(value => {
          const endDate = addCalendarDays(value, 13);
          if (endDate) this.form.controls.endDate.setValue(endDate);
        });
      }
    } catch (error) {
      this.loadError.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.submitting()) return;
    if (!this.controls.alterSprintEnabled()) {
      this.saveError.set('Alter Sprint has expired. Enable it again in Settings.');
      return;
    }
    if (this.form.invalid || this.weekOffDays().length > 2) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.saveError.set('');
    const value = this.form.getRawValue();
    try {
      const response = this.item()
        ? await firstValueFrom(
            this.api.update(this.item()!.id, {
              sprint: value.sprint.trim(),
              projectId: value.projectId,
              startDate: value.startDate,
              endDate: value.endDate,
              plannedLeaveDays: value.plannedLeaveDays,
              holidayDays: value.holidayDays,
            }),
          )
        : await firstValueFrom(
            this.api.create({
              sprint: value.sprint.trim(),
              projectId: value.projectId,
              startDate: value.startDate,
              endDate: value.endDate,
              plannedLeaveDays: value.plannedLeaveDays,
              holidayDays: value.holidayDays,
              makeActive: value.makeActive,
            } satisfies SprintCreateRequest),
          );
      this.form.markAsPristine();
      this.saved.emit(response.data);
    } catch (error) {
      this.saveError.set(await this.writeError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  focusFirst(): void {
    void this.firstField()?.setFocus();
  }

  async requestClose(): Promise<void> {
    if (await this.confirmClose()) {
      this.form.markAsPristine();
      this.closed.emit();
    }
  }

  private confirmClose(): Promise<boolean> {
    if (this.submitting()) return Promise.resolve(false);
    if (!this.form.dirty) return Promise.resolve(true);
    return this.confirmation.confirm({
      title: 'Discard Sprint changes?',
      message: 'Your unsaved Sprint changes will be lost.',
      confirmLabel: 'Discard',
      danger: true,
    });
  }

  private async writeError(error: unknown): Promise<string> {
    if (
      error instanceof HttpErrorResponse &&
      error.status === 403 &&
      this.errorCode(error) === 'ALTER_SPRINT_DISABLED'
    ) {
      await this.controls.refresh().catch(() => undefined);
      const message = 'Alter Sprint has expired. Enable it again in Settings.';
      this.snackbar.error(message);
      return message;
    }
    return apiError(error);
  }

  private errorCode(error: HttpErrorResponse): string {
    const body: unknown = error.error;
    if (typeof body !== 'object' || body === null) return '';
    if ('code' in body && typeof body.code === 'string') return body.code;
    const nested = 'error' in body ? body.error : undefined;
    if (typeof nested === 'string') return nested;
    return typeof nested === 'object' && nested !== null && 'code' in nested && typeof nested.code === 'string'
      ? nested.code
      : '';
  }
}
