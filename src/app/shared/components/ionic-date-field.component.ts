import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonDatetime, IonDatetimeButton, IonModal } from '@ionic/angular';

@Component({
  selector: 'app-ionic-date-field',
  imports: [IonDatetime, IonDatetimeButton, IonModal],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => IonicDateFieldComponent),
      multi: true,
    },
  ],
  host: { class: 'ionic-date-field' },
  template: `<fieldset class="ionic-control-shell" [class.ionic-control-disabled]="disabled()" [disabled]="disabled()">
      <legend class="ionic-field-label" [id]="controlId() + '-label'">{{ label() }}</legend>
      <ion-datetime-button [datetime]="controlId()" [disabled]="disabled()" />
    </fieldset>
    <ion-modal [keepContentsMounted]="true">
      <ng-template>
        <ion-datetime
          [id]="controlId()"
          presentation="date"
          [value]="value() || undefined"
          [disabled]="disabled()"
          [showDefaultButtons]="true"
          [showClearButton]="true"
          doneText="Apply"
          cancelText="Cancel"
          [attr.aria-labelledby]="controlId() + '-label'"
          (ionChange)="dateChanged($event.detail.value)" />
      </ng-template>
    </ion-modal>`,
})
export class IonicDateFieldComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly controlId = input.required<string>();
  readonly value = signal('');
  readonly disabled = signal(false);
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
  }

  dateChanged(value: string | string[] | null | undefined): void {
    const next = Array.isArray(value) ? (value[0] ?? '') : (value?.slice(0, 10) ?? '');
    this.value.set(next);
    this.onChange(next);
    this.onTouched();
  }
}
