import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { MutationApiService } from '../../core/api/mutation-api.service';
import { RelationOptionsService } from '../../core/api/relation-options.service';
import {
  Feedback,
  FeedbackCreateRequest,
  RelationOption,
  ResourceMetadataResponse,
} from '../../shared/models/api.models';
import { metadataOptions, optionId, relationOptions, todayIso } from '../../shared/utils/editor';

@Component({
  selector: 'app-feedback-editor',
  imports: [ReactiveFormsModule, IonButton, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar],
  template: `<ion-modal
    class="editor-modal"
    [isOpen]="open()"
    [backdropDismiss]="!submitting()"
    (didPresent)="focusFirst()"
    (didDismiss)="closed.emit()"
    ><ng-template>
      <ion-header
        ><ion-toolbar
          ><ion-title>{{ item() ? 'Edit feedback' : 'Add feedback' }}</ion-title
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
              >Feedback<input
                #firstField
                id="feedback-title"
                type="text"
                formControlName="feedback"
                required
                [attr.aria-invalid]="form.controls.feedback.invalid"
                aria-describedby="feedback-title-error"
            /></label>
            @if (form.controls.feedback.touched && form.controls.feedback.invalid) {
              <p id="feedback-title-error" class="field-error field-span">Feedback is required.</p>
            }
            <label>Date<input type="date" formControlName="date" /></label>
            <label>Feedback from<input type="text" formControlName="feedbackFrom" /></label>
            <label
              >Person type<select formControlName="personTypeOptionId">
                <option value="">None</option>
                @for (option of options('personTypeOptionId'); track option.id) {
                  <option [value]="option.id">{{ option.name }}</option>
                }
              </select></label
            >
            <label
              >Context<select formControlName="contextOptionId">
                <option value="">None</option>
                @for (option of options('contextOptionId'); track option.id) {
                  <option [value]="option.id">{{ option.name }}</option>
                }
              </select></label
            >
            <label
              >Feedback type<select formControlName="feedbackTypeOptionId">
                <option value="">None</option>
                @for (option of options('feedbackTypeOptionId'); track option.id) {
                  <option [value]="option.id">{{ option.name }}</option>
                }
              </select></label
            >
            <label
              >Company<select formControlName="companyId">
                <option value="">None</option>
                @for (option of companies(); track option.id) {
                  <option [value]="option.id">{{ option.label }}</option>
                }</select
              ><small>Work Type is derived automatically from Company.</small></label
            >
            <label
              >Team<select formControlName="teamId">
                <option value="">None</option>
                @for (option of teams(); track option.id) {
                  <option [value]="option.id">{{ option.label }}</option>
                }
              </select></label
            >
            @if (item()?.workType; as workType) {
              <div class="derived-field">
                <strong>Work Type</strong><span>{{ workType }}</span
                ><small>Automatically derived from Company</small>
              </div>
            }
            <label class="field-span">Details<textarea rows="4" formControlName="details"></textarea></label>
            <label class="field-span"
              >Action / Follow-up<textarea rows="3" formControlName="actionFollowUp"></textarea>
            </label>
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
export class FeedbackEditorComponent {
  readonly open = input(false);
  readonly item = input<Feedback | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Feedback>();
  readonly metadata = signal<ResourceMetadataResponse | null>(null);
  readonly companies = signal<RelationOption[]>([]);
  readonly teams = signal<RelationOption[]>([]);
  readonly loading = signal(false);
  readonly loadError = signal('');
  readonly saveError = signal('');
  readonly submitting = signal(false);
  readonly firstField = viewChild<ElementRef<HTMLInputElement>>('firstField');
  readonly form = new FormGroup({
    feedback: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl(todayIso(), { nonNullable: true }),
    feedbackFrom: new FormControl('', { nonNullable: true }),
    personTypeOptionId: new FormControl('', { nonNullable: true }),
    contextOptionId: new FormControl('', { nonNullable: true }),
    feedbackTypeOptionId: new FormControl('', { nonNullable: true }),
    companyId: new FormControl('', { nonNullable: true }),
    teamId: new FormControl('', { nonNullable: true }),
    details: new FormControl('', { nonNullable: true }),
    actionFollowUp: new FormControl('', { nonNullable: true }),
  });
  optionWarning(): string {
    const item = this.item();
    if (!item || !this.metadata()) return '';
    const missing = (
      [
        ['personTypeOptionId', item.personType, this.form.controls.personTypeOptionId.value],
        ['contextOptionId', item.context, this.form.controls.contextOptionId.value],
        ['feedbackTypeOptionId', item.feedbackType, this.form.controls.feedbackTypeOptionId.value],
      ] as const
    ).some(([key, name, selected]) => name && !optionId(this.metadata(), key, name) && !selected);
    return missing ? 'A saved option is no longer available. Choose a current option before saving.' : '';
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
  options(key: string) {
    return metadataOptions(this.metadata(), key);
  }
  async load(refresh = false): Promise<void> {
    this.loading.set(true);
    this.loadError.set('');
    this.saveError.set('');
    try {
      const [metadata, companies, teams] = await firstValueFrom(
        forkJoin([
          this.api.metadata('/api/feedback/meta', refresh),
          this.relations.load('/api/companies/active', refresh),
          this.relations.load('/api/teams/active', refresh),
        ]),
      );
      this.metadata.set(metadata);
      const item = this.item();
      this.companies.set(this.merge(companies, relationOptions(item?.companyIds ?? [], item?.companies)));
      this.teams.set(this.merge(teams, relationOptions(item?.teamIds ?? [], item?.teams)));
      this.form.reset({
        feedback: item?.feedback ?? '',
        date: item?.date ?? todayIso(),
        feedbackFrom: item?.feedbackFrom ?? '',
        personTypeOptionId: optionId(metadata, 'personTypeOptionId', item?.personType ?? null),
        contextOptionId: optionId(metadata, 'contextOptionId', item?.context ?? null),
        feedbackTypeOptionId: optionId(metadata, 'feedbackTypeOptionId', item?.feedbackType ?? null),
        companyId: item?.companyIds[0] ?? '',
        teamId: item?.teamIds[0] ?? '',
        details: item?.details ?? '',
        actionFollowUp: item?.actionFollowUp ?? '',
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
    const body: FeedbackCreateRequest = {
      ...value,
      date: value.date || null,
      personTypeOptionId: value.personTypeOptionId || null,
      contextOptionId: value.contextOptionId || null,
      feedbackTypeOptionId: value.feedbackTypeOptionId || null,
      companyId: value.companyId || null,
      teamId: value.teamId || null,
    };
    try {
      const item = this.item();
      const response = await firstValueFrom(
        item
          ? this.api.patch<Feedback, FeedbackCreateRequest>('/api/feedback', item.id, body)
          : this.api.create<Feedback, FeedbackCreateRequest>('/api/feedback', body),
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
  requestClose(): void {
    if (!this.submitting() && (!this.form.dirty || window.confirm('Discard unsaved changes?'))) this.closed.emit();
  }
  private merge(loaded: RelationOption[], selected: RelationOption[]) {
    return [...new Map([...selected, ...loaded].map(option => [option.id, option])).values()];
  }
}
