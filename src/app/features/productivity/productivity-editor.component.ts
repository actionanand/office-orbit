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
  IonTextarea,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import {
  DomainItem,
  JiraRef,
  Memo,
  MemoCreateRequest,
  RelationOption,
  ResourceMetadataResponse,
  Task,
  TaskCreateRequest,
  Todo,
  TodoCreateRequest,
} from '../../shared/models/api.models';
import { metadataOptions, optionId, relationOptions, todayIso } from '../../shared/utils/editor';
import { IonicDateFieldComponent } from '../../shared/components/ionic-date-field.component';
import { MarkdownViewerComponent } from './markdown-viewer.component';
import { JiraPickerComponent, JiraPickerSelection } from '../jiras/jira-picker.component';
import { ProductivityKind, ProductivityService } from './productivity.service';

@Component({
  selector: 'app-productivity-editor',
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
    MarkdownViewerComponent,
  ],
  template: `<ion-modal
    class="editor-modal productivity-editor-modal"
    [class.compact-editor-modal]="kind() === 'todos'"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didPresent)="focusFirst()"
    (didDismiss)="closed.emit()">
    <ng-template>
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>{{ item() ? 'Edit' : 'Add' }} {{ singular() }}</ion-title>
          <ion-button slot="end" fill="clear" aria-label="Close editor" [disabled]="submitting()" (click)="close()">
            <ion-icon name="close-outline" slot="icon-only" aria-hidden="true" />
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        @if (loading()) {
          <div class="editor-state" role="status">Loading editor options…</div>
        } @else if (loadError()) {
          <div class="editor-state" role="alert">
            <p>{{ loadError() }}</p>
            <ion-button fill="outline" (click)="load(true)"
              ><ion-icon name="refresh-outline" slot="start" />Retry</ion-button
            >
          </div>
        } @else {
          <form class="editor-form productivity-editor-form" [formGroup]="form" (ngSubmit)="save()">
            <ion-input
              #firstField
              class="field-span"
              fill="outline"
              labelPlacement="stacked"
              [label]="singular()"
              formControlName="title"
              required
              errorText="Enter a title."
              [attr.aria-invalid]="form.controls.title.touched && form.controls.title.invalid ? 'true' : null" />
            @if (kind() === 'todos') {
              <ion-select
                label="Status"
                labelPlacement="stacked"
                fill="outline"
                interface="popover"
                formControlName="statusOptionId">
                <ion-select-option value="">None</ion-select-option>
                @for (option of options('statusOptionId'); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
              <app-ionic-date-field label="Due date" controlId="todo-due-date" formControlName="dueDate" />
              <ion-textarea
                class="field-span"
                fill="outline"
                label="Notes"
                labelPlacement="stacked"
                [autoGrow]="true"
                [rows]="5"
                formControlName="notes" />
            } @else if (kind() === 'tasks') {
              <ion-select
                label="Status"
                labelPlacement="stacked"
                fill="outline"
                interface="popover"
                formControlName="statusOptionId">
                <ion-select-option value="">None</ion-select-option>
                @for (option of options('statusOptionId'); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
              <ion-select
                label="Priority"
                labelPlacement="stacked"
                fill="outline"
                interface="popover"
                formControlName="priorityOptionId">
                <ion-select-option value="">None</ion-select-option>
                @for (option of options('priorityOptionId'); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
              <ion-select
                label="Responsibility"
                labelPlacement="stacked"
                fill="outline"
                interface="popover"
                formControlName="responsibilityOptionId">
                <ion-select-option value="">None</ion-select-option>
                @for (option of options('responsibilityOptionId'); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
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
              <ion-input fill="outline" label="Requested by" labelPlacement="stacked" formControlName="requestedBy" />
              <ion-select
                label="Requested by type"
                labelPlacement="stacked"
                fill="outline"
                interface="popover"
                formControlName="requestedByTypeOptionId">
                <ion-select-option value="">None</ion-select-option>
                @for (option of options('requestedByTypeOptionId'); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
              <ion-input fill="outline" label="Assigned to" labelPlacement="stacked" formControlName="assignedTo" />
              <ion-select
                label="Assigned to type"
                labelPlacement="stacked"
                fill="outline"
                interface="popover"
                formControlName="assignedToTypeOptionId">
                <ion-select-option value="">None</ion-select-option>
                @for (option of options('assignedToTypeOptionId'); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
              <app-ionic-date-field label="Due date" controlId="task-due-date" formControlName="dueDate" />
              <app-ionic-date-field
                label="Follow-up date"
                controlId="task-follow-up-date"
                formControlName="followUpDate" />
              <app-ionic-date-field
                label="Completed date"
                controlId="task-completed-date"
                formControlName="completedDate" />
              <app-jira-picker
                [selectedIds]="form.controls.jiraIds.value"
                [selectedJiras]="selectedJiras()"
                (selectionChange)="jirasChanged($event)" />
              <ion-textarea
                class="field-span"
                fill="outline"
                label="Notes"
                labelPlacement="stacked"
                [autoGrow]="true"
                [rows]="4"
                formControlName="notes" />
              <ion-textarea
                class="field-span"
                fill="outline"
                label="Outcome / Update"
                labelPlacement="stacked"
                [autoGrow]="true"
                [rows]="4"
                formControlName="outcomeUpdate" />
            } @else {
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
                label="Tags"
                labelPlacement="stacked"
                fill="outline"
                interface="alert"
                [multiple]="true"
                formControlName="tagOptionIds">
                @for (option of options('tagOptionIds'); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
              <ion-checkbox justify="start" labelPlacement="end" formControlName="pinned">Pinned</ion-checkbox>
              <div class="field-span markdown-mode" role="group" aria-label="Markdown editor mode">
                <button type="button" [class.active]="!preview()" (click)="preview.set(false)">Edit</button>
                <button type="button" [class.active]="preview()" (click)="preview.set(true)">Preview</button>
              </div>
              @if (preview()) {
                <section class="field-span markdown-editor-preview" aria-label="Markdown preview">
                  <app-markdown-viewer [markdown]="form.controls.markdown.value" />
                </section>
              } @else {
                <ion-textarea
                  class="field-span markdown-editor"
                  fill="outline"
                  label="Markdown"
                  labelPlacement="stacked"
                  [autoGrow]="true"
                  [rows]="16"
                  formControlName="markdown"
                  helperText="{{ form.controls.markdown.value.length }} characters" />
              }
            }
            @if (saveError()) {
              <p class="form-error field-span" role="alert">{{ saveError() }}</p>
            }
            <div class="editor-actions field-span">
              <ion-button type="button" fill="clear" [disabled]="submitting()" (click)="close()">Cancel</ion-button>
              <ion-button type="submit" [disabled]="form.invalid || submitting()"
                ><ion-icon name="save-outline" slot="start" />{{ submitting() ? 'Saving…' : 'Save' }}</ion-button
              >
            </div>
          </form>
        }
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class ProductivityEditorComponent {
  readonly open = input(false);
  readonly kind = input.required<ProductivityKind>();
  readonly item = input<DomainItem | null>(null);
  readonly closed = output<void>();
  readonly saved = output<DomainItem>();
  readonly loading = signal(false);
  readonly submitting = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly preview = signal(false);
  readonly metadata = signal<ResourceMetadataResponse | null>(null);
  readonly companies = signal<RelationOption[]>([]);
  readonly selectedJiras = signal<JiraRef[]>([]);
  readonly firstField = viewChild<IonInput>('firstField');
  readonly form = new FormGroup({
    title: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    statusOptionId: new FormControl('', { nonNullable: true }),
    dueDate: new FormControl('', { nonNullable: true }),
    notes: new FormControl('', { nonNullable: true }),
    priorityOptionId: new FormControl('', { nonNullable: true }),
    responsibilityOptionId: new FormControl('', { nonNullable: true }),
    requestedBy: new FormControl('', { nonNullable: true }),
    requestedByTypeOptionId: new FormControl('', { nonNullable: true }),
    assignedTo: new FormControl('', { nonNullable: true }),
    assignedToTypeOptionId: new FormControl('', { nonNullable: true }),
    followUpDate: new FormControl('', { nonNullable: true }),
    completedDate: new FormControl('', { nonNullable: true }),
    companyId: new FormControl('', { nonNullable: true }),
    jiraIds: new FormControl<string[]>([], { nonNullable: true }),
    outcomeUpdate: new FormControl('', { nonNullable: true }),
    categoryOptionId: new FormControl('', { nonNullable: true }),
    tagOptionIds: new FormControl<string[]>([], { nonNullable: true }),
    pinned: new FormControl(false, { nonNullable: true }),
    markdown: new FormControl('', { nonNullable: true }),
  });
  private readonly api = inject(ProductivityService);
  private readonly relations = inject(RelationOptionsService);
  private readonly confirmation = inject(ConfirmationService);
  readonly canDismiss = () => this.confirmClose();

  constructor() {
    addIcons({ closeOutline, refreshOutline, saveOutline });
    effect(() => {
      if (this.open()) void this.load();
    });
  }

  singular(): string {
    return this.kind() === 'todos' ? 'To Do' : this.kind() === 'tasks' ? 'Task' : 'Memo';
  }
  options(key: string) {
    return metadataOptions(this.metadata(), key);
  }

  async load(refresh = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    this.preview.set(false);
    try {
      const metadata = await firstValueFrom(this.api.metadata(this.kind(), refresh));
      this.metadata.set(metadata);
      const item = this.item();
      if (this.kind() === 'tasks') {
        const companyPath = metadata.fields.find(field => field.key === 'companyId')?.optionsEndpoint;
        const companies = companyPath ? await firstValueFrom(this.relations.load(companyPath, refresh)) : [];
        const task = item as Task | null;
        this.companies.set(this.merge(companies, relationOptions(task?.companyIds ?? [], task?.companies)));
        this.selectedJiras.set(this.taskJiras(task));
      } else {
        this.selectedJiras.set([]);
      }
      const memoDetail =
        this.kind() === 'memos' && item ? await firstValueFrom(this.api.detailMemo(item.id, refresh)) : null;
      this.reset(metadata, item, memoDetail?.markdown ?? '');
    } catch (error) {
      this.loadError.set(apiError(error));
    } finally {
      this.loading.set(false);
    }
  }

  async save(): Promise<void> {
    if (this.form.invalid || this.submitting()) return;
    this.submitting.set(true);
    this.saveError.set('');
    try {
      const value = this.form.getRawValue();
      const kind = this.kind();
      const item = this.item();
      let response: DomainItem;
      if (kind === 'todos') {
        const body: TodoCreateRequest = {
          toDo: value.title.trim(),
          statusOptionId: value.statusOptionId || null,
          dueDate: value.dueDate || null,
          notes: value.notes,
        };
        response = (
          await firstValueFrom(
            item
              ? this.api.patch<Todo, TodoCreateRequest>(kind, item.id, body)
              : this.api.create<Todo, TodoCreateRequest>(kind, body),
          )
        ).data;
      } else if (kind === 'tasks') {
        const body: TaskCreateRequest = {
          task: value.title.trim(),
          statusOptionId: value.statusOptionId || null,
          priorityOptionId: value.priorityOptionId || null,
          responsibilityOptionId: value.responsibilityOptionId || null,
          requestedBy: value.requestedBy,
          requestedByTypeOptionId: value.requestedByTypeOptionId || null,
          assignedTo: value.assignedTo,
          assignedToTypeOptionId: value.assignedToTypeOptionId || null,
          dueDate: value.dueDate || null,
          followUpDate: value.followUpDate || null,
          completedDate: value.completedDate || null,
          companyId: value.companyId || null,
          jiraIds: value.jiraIds,
          notes: value.notes,
          outcomeUpdate: value.outcomeUpdate,
        };
        response = (
          await firstValueFrom(
            item
              ? this.api.patch<Task, TaskCreateRequest>(kind, item.id, body)
              : this.api.create<Task, TaskCreateRequest>(kind, body),
          )
        ).data;
      } else {
        const body: MemoCreateRequest = {
          memo: value.title.trim(),
          categoryOptionId: value.categoryOptionId || null,
          tagOptionIds: value.tagOptionIds,
          pinned: value.pinned,
          markdown: value.markdown,
        };
        response = (
          await firstValueFrom(
            item
              ? this.api.patch<Memo, MemoCreateRequest>(kind, item.id, body)
              : this.api.create<Memo, MemoCreateRequest>(kind, body),
          )
        ).data;
      }
      this.form.markAsPristine();
      this.saved.emit(response);
    } catch (error) {
      this.saveError.set(apiError(error));
    } finally {
      this.submitting.set(false);
    }
  }

  async close(): Promise<void> {
    if (await this.confirmClose()) {
      this.form.markAsPristine();
      this.closed.emit();
    }
  }
  focusFirst(): void {
    void this.firstField()?.setFocus();
  }

  jirasChanged(selection: JiraPickerSelection): void {
    const control = this.form.controls.jiraIds;
    if (control.value.join('\u0000') !== selection.ids.join('\u0000')) control.markAsDirty();
    control.setValue(selection.ids);
    this.selectedJiras.set(selection.jiras);
  }

  private reset(metadata: ResourceMetadataResponse, item: DomainItem | null, markdown: string): void {
    const todo = this.kind() === 'todos' ? (item as Todo | null) : null;
    const task = this.kind() === 'tasks' ? (item as Task | null) : null;
    const memo = this.kind() === 'memos' ? (item as Memo | null) : null;
    this.form.reset({
      title: todo?.toDo ?? task?.task ?? memo?.memo ?? '',
      statusOptionId: optionId(metadata, 'statusOptionId', todo?.status ?? task?.status ?? null),
      dueDate: todo?.dueDate ?? task?.dueDate ?? '',
      notes: todo?.notes ?? task?.notes ?? '',
      priorityOptionId: optionId(metadata, 'priorityOptionId', task?.priority ?? null),
      responsibilityOptionId: optionId(metadata, 'responsibilityOptionId', task?.responsibility ?? null),
      requestedBy: task?.requestedBy ?? '',
      requestedByTypeOptionId: optionId(metadata, 'requestedByTypeOptionId', task?.requestedByType ?? null),
      assignedTo: task?.assignedTo ?? '',
      assignedToTypeOptionId: optionId(metadata, 'assignedToTypeOptionId', task?.assignedToType ?? null),
      followUpDate: task?.followUpDate ?? '',
      completedDate: task?.completedDate ?? '',
      companyId: task?.companyIds[0] ?? '',
      jiraIds: task?.jiraIds ?? [],
      outcomeUpdate: task?.outcomeUpdate ?? '',
      categoryOptionId: optionId(metadata, 'categoryOptionId', memo?.category ?? null),
      tagOptionIds: (memo?.tags ?? []).map(tag => optionId(metadata, 'tagOptionIds', tag)).filter(Boolean),
      pinned: memo?.pinned ?? false,
      markdown,
    });
  }
  private merge(loaded: RelationOption[], selected: RelationOption[]) {
    return [...new Map([...selected, ...loaded].map(option => [option.id, option])).values()];
  }

  private taskJiras(task: Task | null): JiraRef[] {
    if (!task) return [];
    const refs = new Map((task.jiras ?? []).map(jira => [jira.id, jira]));
    return task.jiraIds.map((id, index) => refs.get(id) ?? { id, key: `Selected JIRA ${index + 1}`, summary: '' });
  }
  private async confirmClose(): Promise<boolean> {
    if (this.submitting()) return false;
    if (!this.form.dirty) return true;
    return this.confirmation.confirm({
      title: 'Discard changes?',
      message: `Your unsaved ${this.singular().toLowerCase()} changes will be lost.`,
      confirmLabel: 'Discard',
      danger: true,
    });
  }
}
