import { Component, ElementRef, computed, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import {
  MetadataSelectOption,
  RelationOption,
  ResourceMetadataResponse,
  WorkLog,
  WorkLogCreateRequest,
} from '../../shared/models/api.models';
import { metadataOptions, optionId, relationOptions, todayIso } from '../../shared/utils/editor';

@Component({
  selector: 'app-work-log-editor',
  imports: [ReactiveFormsModule, IonButton, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar],
  template: `<ion-modal
    class="editor-modal"
    [isOpen]="open()"
    [backdropDismiss]="!submitting()"
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
                [attr.aria-invalid]="form.controls.update.invalid"
                aria-describedby="work-log-update-error"
            /></label>
            @if (form.controls.update.touched && form.controls.update.invalid) {
              <p id="work-log-update-error" class="field-error field-span">Update is required.</p>
            }
            <label>Date<input type="date" formControlName="date" /></label>
            <label
              >Category<select formControlName="categoryOptionId">
                <option value="">None</option>
                @for (option of options('categoryOptionId'); track option.id) {
                  <option [value]="option.id">{{ option.name }}</option>
                }
              </select></label
            >
            <label
              >Type<select formControlName="typeOptionId">
                <option value="">None</option>
                @for (option of options('typeOptionId'); track option.id) {
                  <option [value]="option.id">{{ option.name }}</option>
                }
              </select></label
            >
            <label
              >Work mode<select formControlName="workModeOptionId">
                <option value="">None</option>
                @for (option of options('workModeOptionId'); track option.id) {
                  <option [value]="option.id">{{ option.name }}</option>
                }
              </select></label
            >
            <label
              >Project<select formControlName="projectId">
                <option value="">None</option>
                @for (option of projects(); track option.id) {
                  <option [value]="option.id">{{ option.label }}</option>
                }
              </select></label
            >
            <label class="field-span"
              >Search JIRA options<input
                type="search"
                [value]="jiraSearch()"
                (input)="searchJiras($event)"
                placeholder="Key or summary"
            /></label>
            <label class="field-span"
              >JIRAs<select formControlName="jiraIds" multiple size="6">
                @for (option of visibleJiras(); track option.id) {
                  <option [value]="option.id">
                    {{ option.label }}{{ option.description ? ' — ' + option.description : '' }}
                  </option>
                }</select
              ><small
                >Use Ctrl or Command to select multiple JIRAs. Selected values remain available while searching.</small
              ></label
            >
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
  readonly jiras = signal<RelationOption[]>([]);
  readonly jiraSearch = signal('');
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
  readonly visibleJiras = computed(() => {
    const term = this.jiraSearch().trim().toLowerCase();
    const selected = new Set(this.form.controls.jiraIds.value);
    return this.jiras().filter(
      option =>
        selected.has(option.id) || !term || `${option.label} ${option.description ?? ''}`.toLowerCase().includes(term),
    );
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
      const [metadata, projects, jiras] = await firstValueFrom(
        forkJoin([
          this.api.metadata('/api/work-logs/meta', refresh),
          this.relations.load('/api/projects/active', refresh),
          this.relations.load('/api/jiras', refresh),
        ]),
      );
      this.metadata.set(metadata);
      const item = this.item();
      this.projects.set(this.merge(projects, relationOptions(item?.projectIds ?? [], item?.projects)));
      this.jiras.set(
        this.merge(
          jiras,
          (item?.jiraIds ?? []).map(id => ({
            id,
            label: item?.jiras?.find(jira => jira.id === id)?.key ?? 'Selected JIRA',
          })),
        ),
      );
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
      this.jiraSearch.set('');
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
  searchJiras(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.jiraSearch.set(event.target.value);
  }
  requestClose(): void {
    if (!this.submitting() && (!this.form.dirty || window.confirm('Discard unsaved changes?'))) this.closed.emit();
  }
  private merge(loaded: RelationOption[], selected: RelationOption[]): RelationOption[] {
    return [...new Map([...selected, ...loaded].map(option => [option.id, option])).values()];
  }
}
