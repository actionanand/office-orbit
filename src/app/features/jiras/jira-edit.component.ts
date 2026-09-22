import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { Marked } from 'marked';
import { firstValueFrom } from 'rxjs';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import { apiError } from '../../core/api/api-error';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { IonicDateFieldComponent } from '../../shared/components/ionic-date-field.component';
import { JiraDetail, JiraPatchRequest, RelationOption, ResourceMetadataResponse } from '../../shared/models/api.models';
import { metadataOptions, optionId, relationOptions } from '../../shared/utils/editor';
import { JiraPickerComponent, JiraPickerSelection } from './jira-picker.component';
import { JiraService } from './jiras.service';

const marked = new Marked({ gfm: true, breaks: false });

@Component({
  selector: 'app-jira-edit',
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
    IonTextarea,
    IonTitle,
    IonToolbar,
    IonicDateFieldComponent,
    JiraPickerComponent,
  ],
  template: `<ion-modal
    class="editor-modal jira-edit-modal"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didPresent)="focusFirst()"
    (didDismiss)="closed.emit()">
    <ng-template>
      <ion-header
        ><ion-toolbar
          ><ion-title>Edit JIRA</ion-title
          ><ion-button
            slot="end"
            fill="clear"
            aria-label="Close Edit JIRA"
            [disabled]="submitting()"
            (click)="requestClose()"
            ><ion-icon slot="icon-only" name="close-outline" /></ion-button></ion-toolbar
      ></ion-header>
      <ion-content>
        @if (loading()) {
          <div class="editor-state" role="status">Loading JIRA editor…</div>
        } @else if (loadError()) {
          <div class="editor-state" role="alert">
            <p>{{ loadError() }}</p>
            <ion-button fill="outline" (click)="load(true)"
              ><ion-icon name="refresh-outline" slot="start" />Retry</ion-button
            >
          </div>
        } @else {
          <form class="editor-form jira-edit-form" [formGroup]="form" (ngSubmit)="save()">
            <ion-input
              #firstField
              label="Summary"
              labelPlacement="stacked"
              fill="outline"
              formControlName="summary"
              required />
            <section class="field-span rich-text-field">
              <span class="ionic-field-label">Description</span>
              <div
                class="rich-text-editor"
                contenteditable="true"
                role="textbox"
                aria-multiline="true"
                aria-label="Description rich text editor"
                [innerHTML]="descriptionHtml()"
                (input)="descriptionChanged($event)"></div>
            </section>
            <ion-select
              label="Project"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="projectId"
              ><ion-select-option value="">None</ion-select-option>
              @for (option of projects(); track option.id) {
                <ion-select-option [value]="option.id">{{ option.label }}</ion-select-option>
              }
            </ion-select>
            <ion-select
              label="Status"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="statusOptionId"
              ><ion-select-option value="">None</ion-select-option>
              @for (option of options('statusOptionId'); track option.id) {
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
              @for (option of options('tagOptionIds'); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
            <ion-checkbox formControlName="appraisal">Appraisal</ion-checkbox
            ><ion-checkbox formControlName="demoRequired">Demo required</ion-checkbox>
            <app-ionic-date-field label="Demoed date" controlId="jira-demoed-date" formControlName="demoedDate" />
            <ion-textarea
              class="field-span"
              label="Demo notes"
              labelPlacement="stacked"
              fill="outline"
              autoGrow="true"
              formControlName="demoNotes" />
            <app-jira-picker
              class="field-span"
              [multiple]="false"
              label="Linked JIRA"
              [selectedIds]="linkedIds()"
              [selectedJiras]="linkedJiras()"
              [excludeIds]="[item().id]"
              (selectionChange)="linkedChanged($event)" />
            <ion-select
              label="Link type"
              labelPlacement="stacked"
              fill="outline"
              interface="popover"
              formControlName="linkTypeOptionId"
              ><ion-select-option value="">None</ion-select-option>
              @for (option of options('linkTypeOptionId'); track option.id) {
                <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
              }
            </ion-select>
            <ion-input label="Link reason" labelPlacement="stacked" fill="outline" formControlName="linkReason" />
            <app-ionic-date-field
              label="Linked on"
              controlId="jira-linked-on"
              formControlName="linkedOn" /><app-ionic-date-field
              label="Resolved on"
              controlId="jira-resolved-on"
              formControlName="resolvedOn" />
            @if (optionWarning()) {
              <p class="field-error field-span" role="alert">{{ optionWarning() }}</p>
            }
            @if (saveError()) {
              <p class="form-error field-span" role="alert">{{ saveError() }}</p>
            }
            <div class="editor-actions field-span">
              <ion-button type="button" fill="clear" [disabled]="submitting()" (click)="requestClose()"
                >Cancel</ion-button
              ><ion-button type="submit" [disabled]="form.invalid || submitting()"
                ><ion-icon name="save-outline" slot="start" />{{ submitting() ? 'Saving…' : 'Save' }}</ion-button
              >
            </div>
          </form>
        }
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class JiraEditComponent {
  readonly open = input(false);
  readonly item = input.required<JiraDetail>();
  readonly closed = output<void>();
  readonly saved = output<JiraDetail>();
  readonly metadata = signal<ResourceMetadataResponse | null>(null);
  readonly projects = signal<RelationOption[]>([]);
  readonly linkedIds = signal<string[]>([]);
  readonly linkedJiras = signal([] as Array<{ id: string; key: string; summary: string }>);
  readonly descriptionHtml = signal('');
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly submitting = signal(false);
  readonly firstField = viewChild<IonInput>('firstField');
  readonly form = new FormGroup({
    summary: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    projectId: new FormControl('', { nonNullable: true }),
    statusOptionId: new FormControl('', { nonNullable: true }),
    tagOptionIds: new FormControl<string[]>([], { nonNullable: true }),
    appraisal: new FormControl(false, { nonNullable: true }),
    demoRequired: new FormControl(false, { nonNullable: true }),
    demoedDate: new FormControl('', { nonNullable: true }),
    demoNotes: new FormControl('', { nonNullable: true }),
    linkTypeOptionId: new FormControl('', { nonNullable: true }),
    linkReason: new FormControl('', { nonNullable: true }),
    linkedOn: new FormControl('', { nonNullable: true }),
    resolvedOn: new FormControl('', { nonNullable: true }),
  });
  private initialDescription = '';
  private initialLinkedId: string | null = null;
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
  options(key: string) {
    return metadataOptions(this.metadata(), key);
  }
  async load(refresh = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    try {
      const metadata = await firstValueFrom(this.api.editMetadata(refresh));
      const item = this.item();
      this.metadata.set(metadata);
      const projectEndpoint = metadata.fields.find(field => field.key === 'projectId')?.optionsEndpoint;
      const projects = projectEndpoint ? await firstValueFrom(this.relations.load(projectEndpoint, refresh)) : [];
      this.projects.set([
        ...new Map(
          [...relationOptions(item.projectIds, item.projects), ...projects].map(option => [option.id, option]),
        ).values(),
      ]);
      this.initialDescription = item.description;
      this.descriptionHtml.set(String(marked.parse(item.description || '')));
      this.initialLinkedId = item.linkedJiraIds[0] ?? null;
      const linked = item.linkedJiras ?? [];
      this.linkedIds.set(this.initialLinkedId ? [this.initialLinkedId] : []);
      this.linkedJiras.set(linked);
      this.form.reset({
        summary: item.summary,
        projectId: item.projectIds[0] ?? '',
        statusOptionId: optionId(metadata, 'statusOptionId', item.status),
        tagOptionIds: item.tags.map(tag => optionId(metadata, 'tagOptionIds', tag)).filter(Boolean),
        appraisal: item.appraisal,
        demoRequired: item.demoRequired,
        demoedDate: item.demoedDate ?? '',
        demoNotes: item.demoNotes,
        linkTypeOptionId: optionId(metadata, 'linkTypeOptionId', item.linkType),
        linkReason: item.linkReason,
        linkedOn: item.linkedOn ?? '',
        resolvedOn: item.resolvedOn ?? '',
      });
    } catch (error) {
      this.loadError.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }
  descriptionChanged(event: Event): void {
    this.descriptionHtml.set((event.target as HTMLElement).innerHTML);
  }
  linkedChanged(selection: JiraPickerSelection): void {
    this.linkedIds.set(selection.ids);
    this.linkedJiras.set(selection.jiras);
    this.form.markAsDirty();
  }
  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirst();
      return;
    }
    const body = this.patchBody();
    if (Object.keys(body).length === 0) {
      this.closed.emit();
      return;
    }
    this.submitting.set(true);
    this.saveError.set('');
    try {
      const response = await firstValueFrom(this.api.update(this.item().jiraKey, body));
      this.form.markAsPristine();
      this.saved.emit(response.data);
    } catch (error) {
      this.saveError.set(apiError(error));
    } finally {
      this.submitting.set(false);
    }
  }
  patchBody(): JiraPatchRequest {
    const value = this.form.getRawValue();
    const body: JiraPatchRequest = {};
    const dirty = this.form.controls;
    if (dirty.summary.dirty) body.summary = value.summary.trim();
    if (dirty.projectId.dirty) body.projectId = value.projectId || null;
    if (dirty.statusOptionId.dirty) body.statusOptionId = value.statusOptionId || null;
    if (dirty.tagOptionIds.dirty) body.tagOptionIds = value.tagOptionIds;
    if (dirty.appraisal.dirty) body.appraisal = value.appraisal;
    if (dirty.demoRequired.dirty) body.demoRequired = value.demoRequired;
    if (dirty.demoedDate.dirty) body.demoedDate = value.demoedDate || null;
    if (dirty.demoNotes.dirty) body.demoNotes = value.demoNotes;
    if (dirty.linkTypeOptionId.dirty) body.linkTypeOptionId = value.linkTypeOptionId || null;
    if (dirty.linkReason.dirty) body.linkReason = value.linkReason;
    if (dirty.linkedOn.dirty) body.linkedOn = value.linkedOn || null;
    if (dirty.resolvedOn.dirty) body.resolvedOn = value.resolvedOn || null;
    const linked = this.linkedIds()[0] ?? null;
    if (linked !== this.initialLinkedId) body.linkedJiraId = linked;
    if (this.descriptionHtml() !== String(marked.parse(this.initialDescription || '')))
      body.descriptionRichTextHtml = this.descriptionHtml();
    return body;
  }
  optionWarning(): string {
    const item = this.item();
    const metadata = this.metadata();
    return metadata &&
      ((item.status && !optionId(metadata, 'statusOptionId', item.status)) ||
        item.tags.some(tag => !optionId(metadata, 'tagOptionIds', tag)))
      ? 'A saved option is no longer available. Untouched values will be preserved.'
      : '';
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
    return (
      !this.form.dirty ||
      this.confirmation.confirm({
        title: 'Discard JIRA changes?',
        message: 'Your unsaved JIRA changes will be lost.',
        confirmLabel: 'Discard',
        danger: true,
      })
    );
  }
}
