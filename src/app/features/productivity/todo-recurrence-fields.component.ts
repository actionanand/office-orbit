import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { IonCheckbox, IonInput, IonSelect, IonSelectOption } from '@ionic/angular';
import { IonicDateFieldComponent } from '../../shared/components/ionic-date-field.component';
import { ResourceMetadataResponse } from '../../shared/models/api.models';
import { metadataOptions } from '../../shared/utils/editor';
import { RecurrenceForm, optionName, recurrenceValidation } from './todo-recurrence-form';

@Component({
  selector: 'app-todo-recurrence-fields',
  imports: [ReactiveFormsModule, IonCheckbox, IonInput, IonSelect, IonSelectOption, IonicDateFieldComponent],
  template: `<div class="todo-recurrence-fields" [formGroup]="form()">
    <ion-select
      label="Schedule"
      labelPlacement="stacked"
      fill="outline"
      interface="popover"
      formControlName="scheduleOptionId">
      <ion-select-option value="">None</ion-select-option>
      @for (option of options('scheduleOptionId'); track option.id) {
        <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
      }
    </ion-select>
    @if (schedule()) {
      @if (schedule() === 'Weekly') {
        <ion-select
          label="Repeat On"
          labelPlacement="stacked"
          fill="outline"
          interface="alert"
          [multiple]="true"
          formControlName="repeatOnOptionIds">
          @for (option of options('repeatOnOptionIds'); track option.id) {
            <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
          }
        </ion-select>
      }
      @if (schedule() === 'Daily' || schedule() === 'Weekly') {
        <ion-input
          type="number"
          label="Interval (optional)"
          labelPlacement="stacked"
          fill="outline"
          formControlName="interval"
          min="1"
          step="1"
          helperText="Empty or 1 means every cycle." />
        @if ((form().controls.interval.value ?? 1) > 1) {
          <app-ionic-date-field label="Repeat Start" controlId="todo-repeat-start" formControlName="repeatStart" />
        }
      }
      @if (schedule() === 'Monthly') {
        <ion-select
          label="Monthly timing"
          labelPlacement="stacked"
          fill="outline"
          interface="popover"
          formControlName="monthlyTiming">
          <ion-select-option value="specific">Specific day</ion-select-option
          ><ion-select-option value="end">Month end</ion-select-option>
        </ion-select>
        @if (form().controls.monthlyTiming.value === 'end') {
          <ion-select
            label="Month End"
            labelPlacement="stacked"
            fill="outline"
            interface="popover"
            formControlName="monthEndOptionId">
            @for (option of options('monthEndOptionId'); track option.id) {
              <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
            }
          </ion-select>
        }
      }
      @if (schedule() === 'Yearly') {
        <ion-select
          label="Repeat Month"
          labelPlacement="stacked"
          fill="outline"
          interface="popover"
          formControlName="repeatMonthOptionId">
          @for (option of options('repeatMonthOptionId'); track option.id) {
            <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
          }
        </ion-select>
      }
      @if (
        schedule() === 'Yearly' || (schedule() === 'Monthly' && form().controls.monthlyTiming.value === 'specific')
      ) {
        <ion-input
          type="number"
          label="Repeat Day"
          labelPlacement="stacked"
          fill="outline"
          formControlName="repeatDay"
          min="1"
          max="31"
          step="1" />
      }
      <ion-checkbox class="field-span" justify="start" labelPlacement="end" formControlName="workdayAdjust"
        >Workday Adjust</ion-checkbox
      >
      <p class="field-span recurrence-helper">
        Show an early reminder on the previous working day when this recurrence falls on a holiday or week off.
      </p>
      @if (error()) {
        <p class="form-error field-span" role="alert">{{ error() }}</p>
      }
    }
  </div>`,
  styles: `
    :host {
      display: block;
    }
    .todo-recurrence-fields {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 16px;
    }
    .recurrence-helper {
      color: var(--muted);
      margin: 0;
      font-size: 0.85rem;
    }
    @media (max-width: 600px) {
      .todo-recurrence-fields {
        grid-template-columns: minmax(0, 1fr);
      }
    }
  `,
})
export class TodoRecurrenceFieldsComponent {
  readonly form = input.required<RecurrenceForm>();
  readonly metadata = input<ResourceMetadataResponse | null>(null);
  options(key: string) {
    return metadataOptions(this.metadata(), key).filter(
      option => key !== 'scheduleOptionId' || ['Daily', 'Weekly', 'Monthly', 'Yearly'].includes(option.name),
    );
  }
  schedule(): string {
    return optionName(this.metadata(), 'scheduleOptionId', this.form().controls.scheduleOptionId.value);
  }
  error(): string {
    return recurrenceValidation(this.form().getRawValue(), this.metadata());
  }
}
