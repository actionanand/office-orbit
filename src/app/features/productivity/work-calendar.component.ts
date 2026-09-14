import { Component, effect, inject, input, output, signal } from '@angular/core';
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
import { closeOutline, saveOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { Weekday } from '../../shared/models/api.models';
import { WEEKDAYS } from './todo-recurrence';
import { WorkCalendarService, validWeekOffDays } from './work-calendar.service';

@Component({
  selector: 'app-work-calendar',
  imports: [IonButton, IonContent, IonHeader, IonIcon, IonModal, IonSelect, IonSelectOption, IonTitle, IonToolbar],
  template: `<ion-modal
    class="editor-modal work-calendar-modal"
    [isOpen]="open()"
    [canDismiss]="!saving()"
    (didDismiss)="closed.emit()"
    ><ng-template>
      <ion-header
        ><ion-toolbar
          ><ion-title>Work calendar</ion-title
          ><ion-button
            slot="end"
            fill="clear"
            aria-label="Close work calendar"
            [disabled]="saving()"
            (click)="closed.emit()"
            ><ion-icon name="close-outline" slot="icon-only" /></ion-button></ion-toolbar
      ></ion-header>
      <ion-content
        ><div class="editor-form">
          @if (loading()) {
            <p role="status">Loading work calendar…</p>
          } @else if (loadError()) {
            <p role="alert">{{ loadError() }}</p>
            <ion-button (click)="load()">Retry</ion-button>
          } @else {
            <ion-select
              class="field-span"
              label="Week off days"
              labelPlacement="stacked"
              fill="outline"
              interface="alert"
              [multiple]="true"
              [value]="days()"
              (ionChange)="choose($event.detail.value)">
              @for (day of weekdays; track day) {
                <ion-select-option [value]="day">{{ day }}</ion-select-option>
              }
            </ion-select>
            <p class="field-span">
              Choose your non-working weekdays. Leaving this empty means every weekday is a working day.
            </p>
            @if (!valid()) {
              <p class="form-error field-span" role="alert">At least one weekday must remain a working day.</p>
            }
            <div class="editor-actions field-span">
              <ion-button fill="clear" [disabled]="saving()" (click)="closed.emit()">Cancel</ion-button
              ><ion-button [disabled]="!valid() || saving()" (click)="save()"
                ><ion-icon name="save-outline" slot="start" />{{ saving() ? 'Saving…' : 'Save' }}</ion-button
              >
            </div>
          }
        </div></ion-content
      >
    </ng-template></ion-modal
  >`,
})
export class WorkCalendarComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly saved = output<void>();
  readonly days = signal<Weekday[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly loadError = signal('');
  readonly weekdays = WEEKDAYS;
  private readonly api = inject(WorkCalendarService);
  private readonly snackbar = inject(SnackbarService);
  private generation = 0;
  constructor() {
    addIcons({ closeOutline, saveOutline });
    effect(() => {
      if (this.open()) void this.load();
      else {
        this.generation++;
        this.days.set([]);
      }
    });
  }
  valid(): boolean {
    return validWeekOffDays(this.days());
  }
  choose(value: unknown): void {
    if (Array.isArray(value)) this.days.set(value.filter((day): day is Weekday => WEEKDAYS.includes(day)));
  }
  async load(): Promise<void> {
    const generation = ++this.generation;
    this.loading.set(true);
    this.loadError.set('');
    try {
      const result = await firstValueFrom(this.api.get(true));
      if (generation === this.generation) this.days.set(result.weekOffDays);
    } catch (error) {
      if (generation === this.generation) this.loadError.set(apiError(error));
    } finally {
      if (generation === this.generation) this.loading.set(false);
    }
  }
  async save(): Promise<void> {
    if (!this.valid() || this.saving()) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.save(this.days()));
      this.snackbar.success('Work calendar updated.');
      this.saved.emit();
      this.closed.emit();
    } catch (error) {
      this.snackbar.error(apiError(error));
    } finally {
      this.saving.set(false);
    }
  }
}
