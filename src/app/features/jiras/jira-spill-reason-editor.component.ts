import { HttpErrorResponse } from '@angular/common/http';
import { Component, ElementRef, effect, inject, input, output, signal, viewChild } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { closeOutline, saveOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { MarkdownInputComponent } from '../../shared/components/markdown-input.component';
import { JiraDetail, SpillEvent } from '../../shared/models/api.models';
import { JiraService } from './jiras.service';

@Component({
  selector: 'app-jira-spill-reason-editor',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonTitle,
    IonToolbar,
    MarkdownInputComponent,
  ],
  template: `<ion-modal
    class="editor-modal spill-reason-editor-modal"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didPresent)="focusFirst()"
    (didDismiss)="closed.emit()">
    <ng-template>
      <ion-header
        ><ion-toolbar>
          <ion-title
            >{{ event().reason?.trim() ? 'Edit' : 'Add' }} spill reason · Spill #{{ event().number }}</ion-title
          >
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close spill reason editor"
            [disabled]="submitting()"
            (click)="requestClose()">
            <ion-icon [icon]="closeIcon" slot="icon-only" />
          </ion-button> </ion-toolbar
      ></ion-header>
      <ion-content>
        <form class="editor-form" [formGroup]="form" (ngSubmit)="save()">
          <div class="field-span">
            <strong>Spill #{{ event().number }}</strong>
            <p class="spill-route">{{ event().fromSprint.name }} → {{ event().toSprint.name }}</p>
          </div>
          <app-markdown-input
            #firstField
            class="field-span"
            label="Spill reason"
            [rows]="6"
            formControlName="reasonMarkdown" />
          @if (saveError()) {
            <p class="form-error field-span" role="alert">{{ saveError() }}</p>
          }
          <div class="editor-actions field-span">
            <ion-button type="button" fill="clear" [disabled]="submitting()" (click)="requestClose()"
              >Cancel</ion-button
            >
            <ion-button type="submit" [disabled]="submitting()" [attr.aria-busy]="submitting()">
              <ion-icon [icon]="saveIcon" slot="start" />{{ submitting() ? 'Saving…' : 'Save' }}
            </ion-button>
          </div>
        </form>
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class JiraSpillReasonEditorComponent {
  readonly open = input(false);
  readonly jiraKey = input.required<string>();
  readonly event = input.required<SpillEvent>();
  readonly closed = output<void>();
  readonly saved = output<JiraDetail>();
  readonly submitting = signal(false);
  readonly saveError = signal('');
  readonly closeIcon = closeOutline;
  readonly saveIcon = saveOutline;
  readonly form = new FormGroup({ reasonMarkdown: new FormControl('', { nonNullable: true }) });
  private readonly editor = viewChild<MarkdownInputComponent, ElementRef<HTMLElement>>('firstField', {
    read: ElementRef,
  });
  private readonly service = inject(JiraService);
  private readonly confirmation = inject(ConfirmationService);
  readonly canDismiss = () => this.confirmClose();

  constructor() {
    effect(() => {
      if (this.open()) {
        this.form.reset({ reasonMarkdown: this.event().reason ?? '' });
        this.saveError.set('');
      }
    });
  }

  focusFirst(): void {
    this.editor()?.nativeElement.querySelector('textarea')?.focus();
  }

  async save(): Promise<void> {
    if (this.submitting()) return;
    this.submitting.set(true);
    this.saveError.set('');
    const reason = this.form.getRawValue().reasonMarkdown;
    this.form.disable({ emitEvent: false });
    try {
      const response = await firstValueFrom(
        this.service.updateSpillReason(this.jiraKey(), this.event().number, reason),
      );
      this.form.markAsPristine();
      this.saved.emit(response.data);
    } catch (error) {
      this.saveError.set(spillReasonError(error));
    } finally {
      this.form.enable({ emitEvent: false });
      this.submitting.set(false);
    }
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
      title: 'Discard spill reason changes?',
      message: 'Your unsaved spill reason changes will be lost.',
      confirmLabel: 'Discard',
      danger: true,
    });
  }
}

function spillReasonError(error: unknown): string {
  if (!(error instanceof HttpErrorResponse) || error.status !== 409) return apiError(error);
  const messages: Record<string, string> = {
    JIRA_NOT_SPILLED: 'This JIRA no longer has a spill event.',
    SPILL_EVENT_NOT_FOUND: 'This spill event no longer exists. Refresh the JIRA.',
    SPILL_ALLOCATION_MISSING: 'The receiving Sprint has no Sprint Allocation.',
    SPILL_ALLOCATION_CONFLICT: 'Multiple Sprint Allocations exist for the receiving Sprint.',
  };
  const payload: unknown = error.error;
  if (payload && typeof payload === 'object') {
    if ('code' in payload && typeof payload.code === 'string' && Object.hasOwn(messages, payload.code))
      return messages[payload.code];
    if ('error' in payload) {
      const detail: unknown = payload.error;
      if (typeof detail === 'string' && Object.hasOwn(messages, detail)) return messages[detail];
      if (
        detail &&
        typeof detail === 'object' &&
        'code' in detail &&
        typeof detail.code === 'string' &&
        Object.hasOwn(messages, detail.code)
      )
        return messages[detail.code];
    }
  }
  return 'This spill reason could not be updated because the JIRA changed. Refresh the JIRA and try again.';
}
