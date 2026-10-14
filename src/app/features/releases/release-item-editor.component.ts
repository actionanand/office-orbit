import { HttpErrorResponse } from '@angular/common/http';
import { Component, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  IonButton,
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
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { MarkdownInputComponent } from '../../shared/components/markdown-input.component';
import {
  MetadataSelectOption,
  ReleaseCreateRequest,
  ReleaseItem,
  ReleasePatchRequest,
} from '../../shared/models/api.models';
import { metadataOptions, optionId } from '../../shared/utils/editor';
import { ReleaseService } from './releases.service';

@Component({
  selector: 'app-release-item-editor',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonModal,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    MarkdownInputComponent,
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
          <ion-title>{{ item() ? 'Edit Release Item' : 'Add to release item' }}</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close Release Item editor"
            [disabled]="submitting()"
            (click)="requestClose()">
            <ion-icon name="close-outline" slot="icon-only" />
          </ion-button> </ion-toolbar
      ></ion-header>
      <ion-content>
        @if (loading()) {
          <div class="editor-state" role="status">Loading Release options…</div>
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
              <div class="field-span editor-context">
                <strong>JIRA</strong><span>{{ jiraKey() }}</span>
              </div>
            }
            <ion-input
              #firstField
              label="Component Name"
              labelPlacement="stacked"
              fill="outline"
              formControlName="componentName"
              required />
            <ion-select
              label="Deployment Type"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="deploymentTypeOptionId"
              (ionChange)="deploymentChanged.set(true)">
              <ion-select-option value="">None</ion-select-option>
              @for (option of deploymentOptions(); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
            @if (unknownDeploymentType()) {
              <p class="muted field-span">
                Current deployment type: {{ unknownDeploymentType() }}. Choose a current value to replace it.
              </p>
            }
            <ion-input label="Version Number" labelPlacement="stacked" fill="outline" formControlName="versionNumber" />
            <ion-input label="Branch" labelPlacement="stacked" fill="outline" formControlName="branch" />
            <ion-input
              label="Formal Announced Date"
              labelPlacement="stacked"
              fill="outline"
              type="date"
              formControlName="formalAnnouncedDate" />
            <ion-input
              label="Confirmed Release Date"
              labelPlacement="stacked"
              fill="outline"
              type="date"
              formControlName="confirmedReleaseDate" />
            @if (!item()?.confirmedReleaseDate && form.controls.confirmedReleaseDate.value) {
              <p class="form-warning field-span" role="status">
                After a Confirmed Release Date is saved, this Release Item becomes read-only.
              </p>
            }
            <app-markdown-input class="field-span" label="Notes" variant="basic" [rows]="5" formControlName="notes" />
            @if (saveError()) {
              <p class="form-error field-span" role="alert">{{ saveError() }}</p>
            }
            <div class="editor-actions field-span">
              <ion-button type="button" fill="clear" [disabled]="submitting()" (click)="requestClose()"
                >Cancel</ion-button
              >
              <ion-button
                type="submit"
                [disabled]="form.invalid || submitting() || !controls.alterReleaseManagementEnabled()">
                <ion-icon name="save-outline" slot="start" />{{ submitting() ? 'Saving…' : 'Save' }}
              </ion-button>
            </div>
          </form>
        }
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class ReleaseItemEditorComponent {
  readonly open = input(false);
  readonly item = input<ReleaseItem | null>(null);
  readonly jiraId = input<string | null>(null);
  readonly jiraKey = input('');
  readonly closed = output<void>();
  readonly saved = output<ReleaseItem>();
  readonly deploymentOptions = signal<MetadataSelectOption[]>([]);
  readonly unknownDeploymentType = signal('');
  readonly deploymentChanged = signal(false);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly submitting = signal(false);
  readonly firstField = viewChild<IonInput>('firstField');
  readonly form = new FormGroup({
    componentName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    deploymentTypeOptionId: new FormControl('', { nonNullable: true }),
    versionNumber: new FormControl('', { nonNullable: true }),
    branch: new FormControl('', { nonNullable: true }),
    formalAnnouncedDate: new FormControl('', { nonNullable: true }),
    confirmedReleaseDate: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
  });
  private readonly api = inject(ReleaseService);
  readonly controls = inject(AlterControlsService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly snackbar = inject(SnackbarService);
  readonly canDismiss = () => this.confirmClose();

  constructor() {
    addIcons({ closeOutline, refreshOutline, saveOutline });
    effect(() => {
      if (this.open()) void this.load();
    });
  }

  async load(refresh = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    try {
      const metadata = await firstValueFrom(this.api.metadata(refresh));
      const options = metadataOptions(metadata, 'deploymentTypeOptionId');
      this.deploymentOptions.set(options);
      const item = this.item();
      const selectedId = optionId(metadata, 'deploymentTypeOptionId', item?.deploymentType ?? null);
      this.unknownDeploymentType.set(item?.deploymentType && !selectedId ? item.deploymentType : '');
      this.deploymentChanged.set(false);
      this.form.reset({
        componentName: item?.componentName ?? '',
        deploymentTypeOptionId: selectedId,
        versionNumber: item?.versionNumber ?? '',
        branch: item?.branch ?? '',
        formalAnnouncedDate: item?.formalAnnouncedDate ?? '',
        confirmedReleaseDate: item?.confirmedReleaseDate ?? '',
        notes: item?.notes ?? '',
      });
    } catch (error) {
      this.loadError.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.submitting()) return;
    if (!this.controls.alterReleaseManagementEnabled()) {
      this.saveError.set('Alter Release Management has expired. Enable it again in Settings.');
      return;
    }
    if (this.item()?.confirmedReleaseDate) {
      this.saveError.set('Confirmed Release Items are read-only.');
      return;
    }
    if (!this.item() && !this.jiraId()) {
      this.saveError.set('A source JIRA is required.');
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.saveError.set('');
    const value = this.form.getRawValue();
    try {
      const common = {
        componentName: value.componentName.trim(),
        versionNumber: value.versionNumber.trim(),
        branch: value.branch.trim(),
        formalAnnouncedDate: value.formalAnnouncedDate || null,
        confirmedReleaseDate: value.confirmedReleaseDate || null,
        notes: value.notes,
      };
      const item = this.item();
      const response = item
        ? await firstValueFrom(
            this.api.update(item.id, {
              ...common,
              ...(this.deploymentChanged() ? { deploymentTypeOptionId: value.deploymentTypeOptionId || null } : {}),
            } satisfies ReleasePatchRequest),
          )
        : await firstValueFrom(
            this.api.create({
              ...common,
              jiraId: this.jiraId() ?? '',
              deploymentTypeOptionId: value.deploymentTypeOptionId || null,
            } satisfies ReleaseCreateRequest),
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
      title: 'Discard Release Item changes?',
      message: 'Your unsaved Release Item changes will be lost.',
      confirmLabel: 'Discard',
      danger: true,
    });
  }

  private async writeError(error: unknown): Promise<string> {
    const code = error instanceof HttpErrorResponse ? this.errorCode(error) : '';
    if (error instanceof HttpErrorResponse && error.status === 403 && code === 'ALTER_RELEASE_MANAGEMENT_DISABLED') {
      await this.controls.refresh().catch(() => undefined);
      const message = 'Alter Release Management has expired. Enable it again in Settings.';
      this.snackbar.error(message);
      return message;
    }
    if (code === 'RELEASE_ITEM_CONFIRMED') return 'Confirmed Release Items are read-only.';
    if (error instanceof HttpErrorResponse && error.status === 409)
      return 'This Release Item changed. Refresh and try again.';
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
