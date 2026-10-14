import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonIcon, IonInput, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { SprintAllocationPatchData, SprintDetailJira } from '../../shared/models/api.models';
import { SprintService } from './sprints.service';

@Component({
  selector: 'app-sprint-planned-days-editor',
  imports: [ReactiveFormsModule, IonButton, IonContent, IonHeader, IonIcon, IonInput, IonModal, IonTitle, IonToolbar],
  template: `<ion-modal
    class="compact-editor-modal"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didDismiss)="closed.emit()">
    <ng-template>
      <ion-header
        ><ion-toolbar>
          <ion-title>Edit Planned Days</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close Planned Days editor"
            [disabled]="saving()"
            (click)="closed.emit()">
            <ion-icon name="close-outline" slot="icon-only" />
          </ion-button> </ion-toolbar
      ></ion-header>
      <ion-content>
        <form class="editor-form" [formGroup]="form" (ngSubmit)="save()">
          <div class="field-span editor-context">
            <strong>{{ jira()?.jiraKey }}</strong
            ><span>{{ jira()?.summary }}</span>
          </div>
          <ion-input
            #field
            class="field-span"
            label="Planned Days"
            labelPlacement="stacked"
            fill="outline"
            type="number"
            min="0"
            step="0.5"
            formControlName="plannedDays"
            required />
          @if (error()) {
            <p class="form-error field-span" role="alert">{{ error() }}</p>
          }
          <div class="editor-actions field-span">
            <ion-button type="button" fill="clear" [disabled]="saving()" (click)="closed.emit()">Cancel</ion-button>
            <ion-button type="submit" [disabled]="plannedDays.invalid || saving() || !controls.alterSprintEnabled()">
              <ion-icon name="save-outline" slot="start" />{{ saving() ? 'Saving…' : 'Save' }}
            </ion-button>
          </div>
        </form>
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class SprintPlannedDaysEditorComponent {
  readonly open = input(false);
  readonly jira = input<SprintDetailJira | null>(null);
  readonly closed = output<void>();
  readonly saved = output<SprintAllocationPatchData>();
  readonly form = new FormGroup({
    plannedDays: new FormControl<number | null>(null, [Validators.required, Validators.min(0)]),
  });
  readonly plannedDays = this.form.controls.plannedDays;
  readonly saving = signal(false);
  readonly error = signal('');
  readonly field = viewChild<IonInput>('field');
  private readonly api = inject(SprintService);
  readonly controls = inject(AlterControlsService);
  private readonly snackbar = inject(SnackbarService);
  readonly canDismiss = () => !this.saving();

  constructor() {
    addIcons({ closeOutline, saveOutline });
    effect(() => {
      if (!this.open()) return;
      this.plannedDays.reset(this.jira()?.plannedDays ?? 0);
      this.error.set('');
      queueMicrotask(() => void this.field()?.setFocus());
    });
  }

  async save(): Promise<void> {
    const jira = this.jira();
    const value = Number(this.plannedDays.value);
    if (!this.controls.alterSprintEnabled()) {
      this.error.set('Alter Sprint has expired. Enable it again in Settings.');
      return;
    }
    if (
      this.form.invalid ||
      !jira?.allocationId ||
      jira.allocationConflict ||
      this.saving() ||
      !Number.isFinite(value) ||
      value < 0
    )
      return;
    this.saving.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(this.api.updatePlannedDays(jira.allocationId, value));
      this.saved.emit(response.data);
    } catch (error) {
      if (
        error instanceof HttpErrorResponse &&
        error.status === 403 &&
        this.errorCode(error) === 'ALTER_SPRINT_DISABLED'
      ) {
        await this.controls.refresh().catch(() => undefined);
        const message = 'Alter Sprint has expired. Enable it again in Settings.';
        this.error.set(message);
        this.snackbar.error(message);
      } else if (error instanceof HttpErrorResponse && error.status === 409) {
        this.error.set('This Sprint Allocation changed. Refresh and try again.');
      } else {
        this.error.set(apiError(error));
      }
    } finally {
      this.saving.set(false);
    }
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
