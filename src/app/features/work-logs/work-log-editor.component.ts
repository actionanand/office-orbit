import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import {
  MetadataSelectOption,
  JiraRef,
  RelationOption,
  ResourceMetadataResponse,
  WorkLog,
  WorkLogCreateRequest,
} from '../../shared/models/api.models';
import { metadataOptions, optionId, relationOptions, todayIso } from '../../shared/utils/editor';
import { IonicDateFieldComponent } from '../../shared/components/ionic-date-field.component';
import { JiraPickerComponent, JiraPickerSelection } from '../jiras/jira-picker.component';

@Component({
  selector: 'app-work-log-editor',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    IonicDateFieldComponent,
    JiraPickerComponent,
  ],
  template: `<ion-modal
    class="editor-modal"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didPresent)="focusFirst()"
    (didDismiss)="closed.emit()">
    <ng-template>
      <ion-header
        ><ion-toolbar>
          <ion-title>{{ item() ? 'Edit work log' : 'Add work log' }}</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close editor"
            [disabled]="submitting()"
            (click)="requestClose()"
            ><ion-icon slot="icon-only" name="close-outline"
          /></ion-button> </ion-toolbar
      ></ion-header>
      <ion-content>
        @if (loading()) {
          <div class="editor-state" role="status">Loading editor options…</div>
        } @else if (loadError()) {
          <div class="editor-state" role="alert">
            <p>{{ loadError() }}</p>
            <ion-button fill="outline" (click)="load(true)"
              ><ion-icon slot="start" name="refresh-outline" />Retry</ion-button
            >
          </div>
        } @else {
          <form class="editor-form" [formGroup]="form" (ngSubmit)="save()">
            <label class="field-span"
              >Update<input
                #firstField
                id="work-log-update"
                type="text"
                formControlName="update"
                required
                [attr.aria-invalid]="form.controls.update.touched && form.controls.update.invalid ? 'true' : null"
                aria-describedby="work-log-update-error"
            /></label>
            @if (form.controls.update.touched && form.controls.update.invalid) {
              <p id="work-log-update-error" class="field-error field-span">Update is required.</p>
            }
            <app-ionic-date-field label="Date" controlId="work-log-date" formControlName="date" />
            <ion-select
              label="Category"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="categoryOptionId">
              <ion-select-option value="">None</ion-select-option>
              @for (option of options('categoryOptionId'); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
            <ion-select
              label="Type"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="typeOptionId">
              <ion-select-option value="">None</ion-select-option>
              @for (option of options('typeOptionId'); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
            <ion-select
              label="Work mode"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="workModeOptionId">
              <ion-select-option value="">None</ion-select-option>
              @for (option of options('workModeOptionId'); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
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
            <app-jira-picker
              class="field-span"
              [selectedIds]="form.controls.jiraIds.value"
              [selectedJiras]="selectedJiras()"
              (selectionChange)="jirasChanged($event)" />
            <label class="field-span">Comment<textarea rows="3" formControlName="comment"></textarea></label>
            <label class="field-span">Went wrong<textarea rows="3" formControlName="wentWrong"></textarea></label>
            <label class="check-field"><input type="checkbox" formControlName="appraisal" />Appraisal</label>
            @if (optionWarning()) {
              <p class="field-error field-span" role="alert">{{ optionWarning() }}</p>
            }
            @if (saveError()) {
              <p class="form-error field-span" role="alert">{{ saveError() }}</p>
            }
            <div class="editor-actions field-span">
              <ion-button type="button" fill="clear" [disabled]="submitting()" (click)="requestClose()"
                >Cancel</ion-button
              ><ion-button type="submit" [disabled]="!canSave()"
                ><ion-icon slot="start" name="save-outline" />{{ submitting() ? 'Saving…' : 'Save' }}</ion-button
              >
            </div>
          </form>
        }
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class WorkLogEditorComponent {
  readonly open = input(false);
  readonly item = input<WorkLog | null>(null);
  readonly closed = output<void>();
  readonly saved = output<WorkLog>();
  readonly metadata = signal<ResourceMetadataResponse | null>(null);
  readonly projects = signal<RelationOption[]>([]);
  readonly selectedJiras = signal<JiraRef[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly submitting = signal(false);
  readonly firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');
  readonly form = new FormGroup({
    update: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl(todayIso(), { nonNullable: true }),
    categoryOptionId: new FormControl('', { nonNullable: true }),
    typeOptionId: new FormControl('', { nonNullable: true }),
    workModeOptionId: new FormControl('', { nonNullable: true }),
    projectId: new FormControl('', { nonNullable: true }),
    jiraIds: new FormControl<string[]>([], { nonNullable: true }),
    comment: new FormControl('', { nonNullable: true }),
    wentWrong: new FormControl('', { nonNullable: true }),
    appraisal: new FormControl(false, { nonNullable: true }),
  });
  optionWarning(): string {
    const item = this.item();
    if (!item || !this.metadata()) return '';
    const missing = (
      [
        ['categoryOptionId', item.category, this.form.controls.categoryOptionId.value],
        ['typeOptionId', item.type, this.form.controls.typeOptionId.value],
        ['workModeOptionId', item.workMode, this.form.controls.workModeOptionId.value],
      ] as const
    ).filter(([key, name, selected]) => name && !optionId(this.metadata(), key, name) && !selected);
    return missing.length ? 'A saved option is no longer available. Choose a current option before saving.' : '';
  }
  canSave(): boolean {
    return this.form.valid && !this.submitting() && !this.optionWarning();
  }
  private readonly api = inject(MutationApiService);
  private readonly relations = inject(RelationOptionsService);
  private readonly confirmation = inject(ConfirmationService);
  readonly canDismiss = () => this.confirmClose();

  constructor() {
    addIcons({ closeOutline, refreshOutline, saveOutline });
    effect(() => {
      if (this.open()) void this.load();
    });
  }

  options(key: string): MetadataSelectOption[] {
    return metadataOptions(this.metadata(), key);
  }

  async load(refresh = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    try {
      const [metadata, projects] = await firstValueFrom(
        forkJoin([
          this.api.metadata('/api/work-logs/meta', refresh),
          this.relations.load('/api/projects/active', refresh),
        ]),
      );
      this.metadata.set(metadata);
      const item = this.item();
      this.projects.set(this.merge(projects, relationOptions(item?.projectIds ?? [], item?.projects)));
      this.selectedJiras.set(this.workLogJiras(item));
      this.form.reset({
        update: item?.update ?? '',
        date: item?.date ?? todayIso(),
        categoryOptionId: optionId(metadata, 'categoryOptionId', item?.category ?? null),
        typeOptionId: optionId(metadata, 'typeOptionId', item?.type ?? null),
        workModeOptionId: optionId(metadata, 'workModeOptionId', item?.workMode ?? null),
        projectId: item?.projectIds[0] ?? '',
        jiraIds: [...(item?.jiraIds ?? [])],
        comment: item?.comment ?? '',
        wentWrong: item?.wentWrong ?? '',
        appraisal: item?.appraisal ?? false,
      });
    } catch (error) {
      this.loadError.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (!this.canSave()) {
      this.form.markAllAsTouched();
      this.firstField()?.nativeElement.focus();
      return;
    }
    this.submitting.set(true);
    this.saveError.set('');
    const value = this.form.getRawValue();
    const body: WorkLogCreateRequest = {
      ...value,
      date: value.date || null,
      categoryOptionId: value.categoryOptionId || null,
      typeOptionId: value.typeOptionId || null,
      workModeOptionId: value.workModeOptionId || null,
      projectId: value.projectId || null,
    };
    try {
      const item = this.item();
      const response = await firstValueFrom(
        item
          ? this.api.patch<WorkLog, WorkLogCreateRequest>('/api/work-logs', item.id, body)
          : this.api.create<WorkLog, WorkLogCreateRequest>('/api/work-logs', body),
      );
      this.form.markAsPristine();
      this.saved.emit(response.data);
    } catch (error) {
      this.saveError.set(apiError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  focusFirst(): void {
    this.firstField()?.nativeElement.focus();
  }
  jirasChanged(selection: JiraPickerSelection): void {
    const control = this.form.controls.jiraIds;
    if (control.value.join('\u0000') !== selection.ids.join('\u0000')) control.markAsDirty();
    control.setValue(selection.ids);
    this.selectedJiras.set(selection.jiras);
  }
  async requestClose(): Promise<void> {
    if (await this.confirmClose()) {
      this.form.markAsPristine();
      this.closed.emit();
    }
  }
  private merge(loaded: RelationOption[], selected: RelationOption[]): RelationOption[] {
    return [...new Map([...selected, ...loaded].map(option => [option.id, option])).values()];
  }
  private workLogJiras(item: WorkLog | null): JiraRef[] {
    if (!item) return [];
    const refs = new Map((item.jiras ?? []).map(jira => [jira.id, jira]));
    return item.jiraIds.map((id, index) => refs.get(id) ?? { id, key: `Selected JIRA ${index + 1}`, summary: '' });
  }
  private async confirmClose(): Promise<boolean> {
    if (this.submitting()) return false;
    if (!this.form.dirty) return true;
    return this.confirmation.confirm({
      title: 'Discard changes?',
      message: 'Your unsaved work log changes will be lost.',
      confirmLabel: 'Discard',
      danger: true,
    });
  }
}
