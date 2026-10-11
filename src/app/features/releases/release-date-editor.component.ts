import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline } from 'ionicons/icons';
import { IonicDateFieldComponent } from '../../shared/components/ionic-date-field.component';
import { ReleaseBulkDateResponse, ReleaseDateType } from '../../shared/models/api.models';
import { ReleaseService } from './releases.service';

@Component({
  selector: 'app-release-date-editor',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonTitle,
    IonToolbar,
    IonicDateFieldComponent,
  ],
  template: `<ion-modal
    class="release-date-modal"
    [isOpen]="open()"
    [canDismiss]="canDismiss"
    (didDismiss)="closed.emit()">
    <ng-template>
      <ion-header class="ion-no-border"
        ><ion-toolbar
          ><ion-title>{{ title() }}</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close date editor"
            [disabled]="saving()"
            (click)="closed.emit()"
            ><ion-icon slot="icon-only" name="close-outline"
          /></ion-button> </ion-toolbar
      ></ion-header>
      <ion-content
        ><form class="release-date-form" (submit)="onSubmit($event)">
          <p>{{ selectedIds().length }} selected release{{ selectedIds().length === 1 ? '' : 's' }}</p>
          <app-ionic-date-field label="Date" controlId="release-bulk-date" [formControl]="form" />
          @if (form.value) {
            <p class="release-date-confirm">
              Apply {{ displayDate(form.value) }} to all {{ selectedIds().length }} selected releases?
            </p>
          }
          @if (error()) {
            <p class="form-error" role="alert">{{ error() }}</p>
          }
          <div class="editor-actions">
            <ion-button type="button" fill="clear" [disabled]="saving()" (click)="closed.emit()">Cancel</ion-button>
            <ion-button type="submit" [disabled]="saving() || form.invalid">{{
              saving() ? 'Applying…' : 'Apply date'
            }}</ion-button>
          </div>
        </form></ion-content
      >
    </ng-template>
  </ion-modal>`,
})
export class ReleaseDateEditorComponent {
  readonly open = input(false);
  readonly dateType = input.required<ReleaseDateType>();
  readonly selectedIds = input.required<string[]>();
  readonly closed = output<void>();
  readonly saved = output<ReleaseBulkDateResponse>();
  readonly failed = output<unknown>();
  readonly form = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  readonly saving = signal(false);
  readonly error = signal('');
  readonly title = computed(() => `Set ${this.dateType() === 'announcement' ? 'announcement' : 'release'} date`);
  readonly canDismiss = () => !this.saving();
  private readonly releases = inject(ReleaseService);

  constructor() {
    addIcons({ closeOutline });
    effect(() => {
      if (!this.open()) return;
      this.form.reset('');
      this.error.set('');
    });
  }

  onSubmit(event: Event): void {
    event.preventDefault();
    void this.submit();
  }

  async submit(): Promise<void> {
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    try {
      this.saved.emit(
        await firstValueFrom(this.releases.bulkSetDate(this.selectedIds(), this.dateType(), this.form.value)),
      );
    } catch (error) {
      this.error.set(this.message(error));
      this.failed.emit(error);
    } finally {
      this.saving.set(false);
    }
  }

  displayDate(value: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${value}T00:00:00Z`));
  }
  private message(error: unknown): string {
    if (typeof error === 'object' && error !== null && 'status' in error && error.status === 409) {
      const count = this.conflictCount(error);
      return `${this.title()} could not be added because ${
        count ? `${count} selected release${count === 1 ? '' : 's'}` : 'one or more selected releases'
      } already have a date.`;
    }
    return 'The release date could not be updated.';
  }

  private conflictCount(error: object): number | null {
    if (!('error' in error) || typeof error.error !== 'object' || error.error === null) return null;
    const conflicts = 'conflicts' in error.error ? error.error.conflicts : null;
    return Array.isArray(conflicts) ? conflicts.length : null;
  }
}
