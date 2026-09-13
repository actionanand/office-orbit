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
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { Jira, JiraCreateRequest, RelationOption, ResourceMetadataResponse } from '../../shared/models/api.models';
import { metadataOptions } from '../../shared/utils/editor';
import { JiraService } from './jiras.service';

const JIRA_KEY_PATTERN = /^[A-Za-z][A-Za-z0-9]+-\d+$/;

@Component({
  selector: 'app-jira-create',
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
    class="editor-modal jira-create-modal"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didPresent)="focusFirst()"
    (didDismiss)="closed.emit()"
    ><ng-template>
      <ion-header
        ><ion-toolbar
          ><ion-title>Add JIRA</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close Add JIRA"
            [disabled]="submitting()"
            (click)="requestClose()">
            <ion-icon name="close-outline" slot="icon-only"
          /></ion-button> </ion-toolbar
      ></ion-header>
      <ion-content>
        @if (loading()) {
          <div class="editor-state" role="status">Loading JIRA options…</div>
        } @else if (loadError()) {
          <div class="editor-state" role="alert">
            <p>{{ loadError() }}</p>
            <ion-button fill="outline" (click)="load(true)"
              ><ion-icon name="refresh-outline" slot="start" />Retry</ion-button
            >
          </div>
        } @else {
          <form class="editor-form jira-create-form" [formGroup]="form" (ngSubmit)="save()">
            <ion-input
              #firstField
              label="JIRA key"
              labelPlacement="stacked"
              fill="outline"
              formControlName="jiraKey"
              placeholder="LSC-12345"
              required
              aria-describedby="jira-key-error" />
            @if (form.controls.jiraKey.touched && form.controls.jiraKey.invalid) {
              <p id="jira-key-error" class="field-error">Use a key such as LSC-12345.</p>
            }
            <ion-input
              class="field-span"
              label="Summary"
              labelPlacement="stacked"
              fill="outline"
              formControlName="summary"
              required
              aria-describedby="jira-summary-error" />
            @if (form.controls.summary.touched && form.controls.summary.invalid) {
              <p id="jira-summary-error" class="field-error field-span">Summary is required.</p>
            }
            <ion-select
              label="Project"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="projectId">
              <ion-select-option value="">None</ion-select-option>
              @for (option of projects(); track option.id) {
                <ion-select-option [value]="option.id">{{ option.label }}</ion-select-option>
              }
            </ion-select>
            <ion-select
              label="Status"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="statusOptionId">
              <ion-select-option value="">None</ion-select-option>
              @for (option of statusOptions(); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
            <ion-select
              class="field-span"
              label="Tags"
              labelPlacement="stacked"
              fill="outline"
              interface="alert"
              multiple="true"
              formControlName="tagOptionIds">
              @for (option of tagOptions(); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
            <div class="jira-create-checks field-span" role="group" aria-label="JIRA options">
              <ion-checkbox formControlName="inActiveSprint">Add to active Sprint</ion-checkbox>
              <ion-checkbox formControlName="demoRequired">Demo required</ion-checkbox>
              <ion-checkbox formControlName="appraisal">Appraisal</ion-checkbox>
            </div>
            @if (saveError()) {
              <p class="form-error field-span" role="alert">{{ saveError() }}</p>
            }
            <div class="editor-actions field-span">
              <ion-button type="button" fill="clear" [disabled]="submitting()" (click)="requestClose()"
                >Cancel</ion-button
              >
              <ion-button type="submit" [disabled]="form.invalid || submitting()">
                <ion-icon name="save-outline" slot="start" />{{ submitting() ? 'Saving…' : 'Save' }}
              </ion-button>
            </div>
          </form>
        }
      </ion-content>
    </ng-template></ion-modal
  >`,
})
export class JiraCreateComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly saved = output<Jira>();
  readonly metadata = signal<ResourceMetadataResponse | null>(null);
  readonly projects = signal<RelationOption[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly submitting = signal(false);
  readonly firstField = viewChild<IonInput>('firstField');
  readonly form = new FormGroup({
    jiraKey: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.pattern(JIRA_KEY_PATTERN)],
    }),
    summary: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    projectId: new FormControl('', { nonNullable: true }),
    statusOptionId: new FormControl('', { nonNullable: true }),
    tagOptionIds: new FormControl<string[]>([], { nonNullable: true }),
    inActiveSprint: new FormControl(false, { nonNullable: true }),
    demoRequired: new FormControl(false, { nonNullable: true }),
    appraisal: new FormControl(false, { nonNullable: true }),
  });
  private readonly api = inject(JiraService);
  private readonly relations = inject(RelationOptionsService);
  private readonly confirmation = inject(ConfirmationService);
  readonly canDismiss = () => this.confirmClose();

  constructor() {
    addIcons({ closeOutline, refreshOutline, saveOutline });
    effect(() => {
      if (this.open()) void this.load();
    });
  }
  statusOptions() {
    return metadataOptions(this.metadata(), 'statusOptionId');
  }
  tagOptions() {
    return metadataOptions(this.metadata(), 'tagOptionIds');
  }
  async load(refresh = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    try {
      const metadata = await firstValueFrom(this.api.metadata(refresh));
      this.metadata.set(metadata);
      const endpoint = metadata.fields.find(field => field.key === 'projectId')?.optionsEndpoint;
      this.projects.set(endpoint ? await firstValueFrom(this.relations.load(endpoint, refresh)) : []);
      this.form.reset({
        jiraKey: '',
        summary: '',
        projectId: '',
        statusOptionId: '',
        tagOptionIds: [],
        inActiveSprint: false,
        demoRequired: false,
        appraisal: false,
      });
    } catch (error) {
      this.loadError.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }
  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirst();
      return;
    }
    this.submitting.set(true);
    this.saveError.set('');
    const value = this.form.getRawValue();
    const body: JiraCreateRequest = {
      jiraKey: value.jiraKey.trim(),
      summary: value.summary.trim(),
      projectId: value.projectId || null,
      statusOptionId: value.statusOptionId || null,
      tagOptionIds: value.tagOptionIds,
      inActiveSprint: value.inActiveSprint,
      demoRequired: value.demoRequired,
      appraisal: value.appraisal,
    };
    try {
      const response = await firstValueFrom(this.api.create(body));
      this.form.markAsPristine();
      this.saved.emit(response.data);
    } catch (error) {
      this.saveError.set(this.createError(error));
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
  private async confirmClose(): Promise<boolean> {
    if (this.submitting()) return false;
    if (!this.form.dirty) return true;
    return this.confirmation.confirm({
      title: 'Discard JIRA?',
      message: 'Your unsaved JIRA will be lost.',
      confirmLabel: 'Discard',
      danger: true,
    });
  }
  private createError(error: unknown): string {
    if (error instanceof HttpErrorResponse && error.status === 409) {
      const message = typeof error.error?.error === 'string' ? error.error.error : '';
      if (message === 'JIRA already exists') return 'That JIRA key already exists.';
      if (message) return message;
    }
    return apiError(error);
  }
}
