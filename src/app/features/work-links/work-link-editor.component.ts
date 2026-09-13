import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { AbstractControl, FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  RelationOption,
  ResourceMetadataResponse,
  WorkLink,
  WorkLinkCreateRequest,
} from '../../shared/models/api.models';
import { metadataOptions, optionId, relationOptions } from '../../shared/utils/editor';

function validOptionalUrl(control: AbstractControl<string>) {
  const value = control.value.trim();
  if (!value) return null;
  try {
    new URL(value);
    return null;
  } catch {
    return { url: true };
  }
}

@Component({
  selector: 'app-work-link-editor',
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
  ],
  template: `<ion-modal
    class="editor-modal work-link-editor-modal"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didPresent)="focusFirst()"
    (didDismiss)="closed.emit()"
    ><ng-template>
      <ion-header
        ><ion-toolbar
          ><ion-title>{{ item() ? 'Edit work link' : 'Add work link' }}</ion-title
          ><ion-button
            slot="end"
            fill="clear"
            aria-label="Close editor"
            [disabled]="submitting()"
            (click)="requestClose()"
            ><ion-icon slot="icon-only" name="close-outline" /></ion-button></ion-toolbar
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
              >Link title<input
                #firstField
                id="work-link-title"
                type="text"
                formControlName="link"
                required
                [attr.aria-invalid]="form.controls.link.touched && form.controls.link.invalid ? 'true' : null"
                aria-describedby="work-link-title-error"
            /></label>
            @if (form.controls.link.touched && form.controls.link.invalid) {
              <p id="work-link-title-error" class="field-error field-span">Link title is required.</p>
            }
            <ion-select
              label="Type"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="typeOptionId">
              <ion-select-option value="">None</ion-select-option>
              @for (option of options(); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
            <label
              >URL<input
                type="url"
                formControlName="url"
                placeholder="https://"
                [attr.aria-invalid]="form.controls.url.touched && form.controls.url.invalid ? 'true' : null"
                aria-describedby="work-link-url-error"
            /></label>
            @if (form.controls.url.touched && form.controls.url.invalid) {
              <p id="work-link-url-error" class="field-error field-span">Enter a valid URL or leave it empty.</p>
            }
            <ion-select
              label="Company"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="companyId">
              <ion-select-option value="">None</ion-select-option>
              @for (option of companies(); track option.id) {
                <ion-select-option [value]="option.id">{{ option.label }}</ion-select-option>
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
            <label class="field-span">Notes<textarea rows="4" formControlName="notes"></textarea></label>
            <label class="check-field"><input type="checkbox" formControlName="active" />Active</label>
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
    </ng-template></ion-modal
  >`,
})
export class WorkLinkEditorComponent {
  readonly open = input(false);
  readonly item = input<WorkLink | null>(null);
  readonly closed = output<void>();
  readonly saved = output<WorkLink>();
  readonly metadata = signal<ResourceMetadataResponse | null>(null);
  readonly companies = signal<RelationOption[]>([]);
  readonly projects = signal<RelationOption[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly submitting = signal(false);
  readonly firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');
  readonly form = new FormGroup({
    link: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    typeOptionId: new FormControl('', { nonNullable: true }),
    url: new FormControl('', { nonNullable: true, validators: [validOptionalUrl] }),
    companyId: new FormControl('', { nonNullable: true }),
    projectId: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    active: new FormControl(true, { nonNullable: true }),
  });
  optionWarning(): string {
    const item = this.item();
    return item?.type &&
      this.metadata() &&
      !optionId(this.metadata(), 'typeOptionId', item.type) &&
      !this.form.controls.typeOptionId.value
      ? 'The saved Type is no longer available. Choose a current option before saving.'
      : '';
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
  options() {
    return metadataOptions(this.metadata(), 'typeOptionId');
  }
  async load(refresh = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    try {
      const [metadata, companies, projects] = await firstValueFrom(
        forkJoin([
          this.api.metadata('/api/work-links/meta', refresh),
          this.relations.load('/api/companies/active', refresh),
          this.relations.load('/api/projects/active', refresh),
        ]),
      );
      this.metadata.set(metadata);
      const item = this.item();
      this.companies.set(this.merge(companies, relationOptions(item?.companyIds ?? [], item?.companies)));
      this.projects.set(this.merge(projects, relationOptions(item?.projectIds ?? [], item?.projects)));
      this.form.reset({
        link: item?.link ?? '',
        typeOptionId: optionId(metadata, 'typeOptionId', item?.type ?? null),
        url: item?.url ?? '',
        companyId: item?.companyIds[0] ?? '',
        projectId: item?.projectIds[0] ?? '',
        notes: item?.notes ?? '',
        active: item?.active ?? true,
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
      this.focusFirst();
      return;
    }
    this.submitting.set(true);
    this.saveError.set('');
    const value = this.form.getRawValue();
    const body: WorkLinkCreateRequest = {
      ...value,
      typeOptionId: value.typeOptionId || null,
      url: value.url.trim() || null,
      companyId: value.companyId || null,
      projectId: value.projectId || null,
    };
    try {
      const item = this.item();
      const response = await firstValueFrom(
        item
          ? this.api.patch<WorkLink, WorkLinkCreateRequest>('/api/work-links', item.id, body)
          : this.api.create<WorkLink, WorkLinkCreateRequest>('/api/work-links', body),
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
  async requestClose(): Promise<void> {
    if (await this.confirmClose()) {
      this.form.markAsPristine();
      this.closed.emit();
    }
  }
  private merge(loaded: RelationOption[], selected: RelationOption[]) {
    return [...new Map([...selected, ...loaded].map(option => [option.id, option])).values()];
  }
  private async confirmClose(): Promise<boolean> {
    if (this.submitting()) return false;
    if (!this.form.dirty) return true;
    return this.confirmation.confirm({
      title: 'Discard changes?',
      message: 'Your unsaved work link changes will be lost.',
      confirmLabel: 'Discard',
      danger: true,
    });
  }
}
