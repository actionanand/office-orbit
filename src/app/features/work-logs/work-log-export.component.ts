import { Component, inject, input, output, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, documentOutline, printOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../dashboard/dashboard.service';
import { monthRange } from './calendar';
import { ExportOptions, exportCategories, validateExport } from './work-log-report';
import { WorkLogExportService } from './work-log-export.service';

export function localDate(date: Date): string {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}
@Component({
  selector: 'app-work-log-export',
  imports: [ReactiveFormsModule, IonButton, IonContent, IonHeader, IonIcon, IonModal, IonTitle, IonToolbar],
  template: `<ion-modal
    class="export-modal"
    [isOpen]="open()"
    [canDismiss]="!exporter.busy()"
    (didDismiss)="closed.emit()">
    <ng-template>
      <ion-header
        ><ion-toolbar
          ><ion-title>Work Log export</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close export options"
            [disabled]="exporter.busy()"
            (click)="closed.emit()"
            ><ion-icon name="close-outline" slot="icon-only"
          /></ion-button> </ion-toolbar
      ></ion-header>
      <ion-content
        ><div class="export-options">
          <fieldset [disabled]="exporter.busy()">
            <label
              >Period<select [value]="preset()" (change)="changePreset($event)">
                <option value="today">Today</option>
                <option value="week">This week</option>
                <option value="month">This month</option>
                <option value="previous">Previous month</option>
                <option value="sprint">Current Sprint</option>
                <option value="custom">Custom</option>
              </select></label
            >
            <form [formGroup]="form" class="report-dates">
              <label>From<input type="date" formControlName="from" (change)="preset.set('custom')" /></label>
              <label>To<input type="date" formControlName="to" (change)="preset.set('custom')" /></label>
            </form>
            <fieldset>
              <legend>Categories</legend>
              @for (category of categories; track category) {
                <label class="check-label"
                  ><input
                    type="checkbox"
                    [checked]="selected().includes(category)"
                    (change)="toggleCategory(category, $event)" />{{ category }}</label
                >
              }
            </fieldset>
            <fieldset [formGroup]="form">
              <legend>Content</legend>
              <label class="check-label"><input type="checkbox" formControlName="comment" />Include Comment</label>
              <label class="check-label"><input type="checkbox" formControlName="wentWrong" />Include Went Wrong</label>
              <label class="check-label"
                ><input type="checkbox" formControlName="organization" />Include Project, Company and Team</label
              >
              <label class="check-label"><input type="checkbox" formControlName="jiras" />Include JIRAs</label>
              <label class="check-label"><input type="checkbox" formControlName="appraisal" />Include Appraisal</label>
            </fieldset>
          </fieldset>
          @if (error()) {
            <p role="alert">{{ error() }}</p>
          }
          <p role="status" aria-live="polite">{{ exporter.status() }}</p>
          <div class="export-actions">
            @if (!exporter.android) {
              <ion-button fill="outline" [disabled]="exporter.busy()" (click)="run('print')"
                ><ion-icon name="print-outline" slot="start" />Print</ion-button
              >
            }
            <ion-button [disabled]="exporter.busy()" (click)="run('pdf')"
              ><ion-icon name="document-outline" slot="start" />Export PDF</ion-button
            >
          </div>
        </div></ion-content
      >
    </ng-template>
  </ion-modal>`,
})
export class WorkLogExportComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly exporter = inject(WorkLogExportService);
  private readonly dashboard = inject(DashboardService);
  readonly categories = exportCategories;
  readonly selected = signal<string[]>([...exportCategories]);
  readonly preset = signal('month');
  readonly error = signal('');
  readonly form = new FormGroup({
    from: new FormControl(monthRange(localDate(new Date()).slice(0, 7)).from, { nonNullable: true }),
    to: new FormControl(monthRange(localDate(new Date()).slice(0, 7)).to, { nonNullable: true }),
    comment: new FormControl(true, { nonNullable: true }),
    wentWrong: new FormControl(false, { nonNullable: true }),
    organization: new FormControl(true, { nonNullable: true }),
    jiras: new FormControl(true, { nonNullable: true }),
    appraisal: new FormControl(true, { nonNullable: true }),
  });
  constructor() {
    addIcons({ closeOutline, documentOutline, printOutline });
  }
  toggleCategory(category: string, event: Event): void {
    if (!(event.target instanceof HTMLInputElement)) return;
    this.selected.update(values =>
      event.target instanceof HTMLInputElement && event.target.checked
        ? [...values, category]
        : values.filter(value => value !== category),
    );
  }
  async changePreset(event: Event): Promise<void> {
    if (!(event.target instanceof HTMLSelectElement)) return;
    const preset = event.target.value;
    this.preset.set(preset);
    this.error.set('');
    const today = new Date();
    let from = localDate(today);
    let to = from;
    if (preset === 'custom') return;
    if (preset === 'week') {
      today.setDate(today.getDate() - ((today.getDay() + 6) % 7));
      from = localDate(today);
      today.setDate(today.getDate() + 6);
      to = localDate(today);
    }
    if (preset === 'month' || preset === 'previous') {
      if (preset === 'previous') today.setMonth(today.getMonth() - 1, 1);
      ({ from, to } = monthRange(localDate(today).slice(0, 7)));
    }
    if (preset === 'sprint') {
      try {
        const sprint = (await firstValueFrom(this.dashboard.get())).currentSprint;
        if (!sprint?.startDate || !sprint.endDate) {
          this.error.set('Current Sprint dates are unavailable. Choose a custom period.');
          this.form.patchValue({ from: '', to: '' });
          return;
        }
        from = sprint.startDate;
        to = sprint.endDate;
      } catch {
        this.error.set('Unable to load Current Sprint dates. Choose a custom period.');
        this.form.patchValue({ from: '', to: '' });
        return;
      }
    }
    this.form.patchValue({ from, to });
  }
  run(action: 'print' | 'pdf'): void {
    const options: ExportOptions = { ...this.form.getRawValue(), categories: this.selected() };
    const error = validateExport(options);
    this.error.set(error);
    if (!error) void this.exporter.run(options, action);
  }
}
