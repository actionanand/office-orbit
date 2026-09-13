import { Component, computed, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { IonButton, IonDatetime, IonModal } from '@ionic/angular';

@Component({
  selector: 'app-ionic-date-field',
  imports: [IonButton, IonDatetime, IonModal],
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
      <button
        class="ionic-date-trigger"
        type="button"
        [disabled]="disabled()"
        [attr.aria-label]="label() + ': ' + (displayValue() || 'Set date')"
        aria-haspopup="dialog"
        (click)="openPicker()">
        <span [class.ionic-date-placeholder]="!value()">{{ displayValue() || 'Set date' }}</span>
      </button>
    </fieldset>
    <ion-modal
      class="ionic-date-modal"
      [isOpen]="pickerOpen()"
      [attr.aria-labelledby]="controlId() + '-dialog-label'"
      (didDismiss)="cancel()">
      <ng-template>
        <section class="ionic-date-dialog" [attr.aria-labelledby]="controlId() + '-dialog-label'">
          <h2 [id]="controlId() + '-dialog-label'">{{ label() }}</h2>
          <ion-datetime
            [id]="controlId() + '-picker'"
            presentation="date"
            [value]="draftValue()"
            [disabled]="disabled()"
            [attr.aria-label]="label()"
            (ionChange)="draftChanged($event.detail.value)" />
          <div class="ionic-date-actions">
            <ion-button type="button" fill="clear" color="danger" aria-label="Clear selected date" (click)="clear()"
              >Clear</ion-button
            >
            <span>
              <ion-button type="button" fill="clear" (click)="cancel()">Cancel</ion-button>
              <ion-button type="button" (click)="apply()">Apply</ion-button>
            </span>
          </div>
        </section>
      </ng-template>
    </ion-modal>`,
})
export class IonicDateFieldComponent implements ControlValueAccessor {
  readonly label = input.required<string>();
  readonly controlId = input.required<string>();
  readonly value = signal('');
  readonly disabled = signal(false);
  readonly pickerOpen = signal(false);
  readonly draftValue = signal('');
  readonly displayValue = computed(() => formatDate(this.value()));
  private onChange: (value: string) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value.set(normalizeDate(value));
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled.set(disabled);
    if (disabled) this.pickerOpen.set(false);
  }

  openPicker(): void {
    if (this.disabled()) return;
    this.draftValue.set(this.value() || localTodayIso());
    this.pickerOpen.set(true);
  }

  draftChanged(value: string | string[] | null | undefined): void {
    this.draftValue.set(normalizeDate(Array.isArray(value) ? value[0] : value));
  }

  apply(): void {
    this.commit(this.draftValue());
  }

  clear(): void {
    this.commit('');
  }

  cancel(): void {
    this.draftValue.set(this.value());
    this.pickerOpen.set(false);
  }

  private commit(value: string): void {
    const next = normalizeDate(value);
    this.value.set(next);
    this.draftValue.set(next);
    this.onChange(next);
    this.onTouched();
    this.pickerOpen.set(false);
  }
}

function normalizeDate(value: string | null | undefined): string {
  return value?.slice(0, 10) ?? '';
}

function formatDate(value: string): string {
  if (!value) return '';
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function localTodayIso(now = new Date()): string {
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join(
    '-',
  );
}
