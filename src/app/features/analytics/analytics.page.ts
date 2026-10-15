import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { apiErrorCode } from '../../core/api/api-error';
import { IonicDateFieldComponent } from '../../shared/components/ionic-date-field.component';
import { HistoricalAnalyticsResponse } from '../../shared/models/api.models';
import { formatRelativeTime } from '../../shared/utils/format';
import { AnalyticsChartComponent } from './analytics-chart.component';
import { analyticsCharts } from './analytics-chart.models';
import { AnalyticsRangePreset, analyticsRange, validateAnalyticsRange } from './analytics-range';
import { AnalyticsService } from './analytics.service';

@Component({
  selector: 'app-analytics',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    IonicDateFieldComponent,
    AnalyticsChartComponent,
  ],
  template: `<ion-header
      ><ion-toolbar
        ><ion-title>Analytics</ion-title
        ><ion-button slot="end" fill="clear" aria-label="Refresh analytics" [disabled]="loading()" (click)="load(true)"
          ><ion-icon name="refresh-outline" slot="icon-only" /></ion-button></ion-toolbar
    ></ion-header>
    <ion-content
      ><main class="page-wrap analytics-page">
        <header class="page-heading">
          <div>
            <p class="eyebrow">Office Orbit</p>
            <h1>Analytics</h1>
            <p>Historical work, Sprint capacity and spill trends.</p>
          </div>
        </header>
        <form class="analytics-range" [formGroup]="form" (ngSubmit)="applyRange()">
          <ion-select
            label="Range"
            labelPlacement="stacked"
            fill="outline"
            interface="popover"
            [value]="preset()"
            (ionChange)="rangeChanged($event.detail.value)"
            ><ion-select-option value="30">30 days</ion-select-option
            ><ion-select-option value="90">90 days</ion-select-option
            ><ion-select-option value="6m">6 months</ion-select-option
            ><ion-select-option value="1y">1 year</ion-select-option
            ><ion-select-option value="custom">Custom</ion-select-option></ion-select
          ><app-ionic-date-field label="From" controlId="analytics-from" formControlName="from" /><app-ionic-date-field
            label="To"
            controlId="analytics-to"
            formControlName="to" /><ion-button type="submit" fill="outline">Apply</ion-button>
        </form>
        @if (error()) {
          <p class="form-error" role="alert">{{ error() }}</p>
        }
        @if (loading() && !data()) {
          <p role="status">Loading historical analytics…</p>
        }
        @if (loading() && data()) {
          <p class="updated-label" role="status">Refreshing historical analytics…</p>
        }
        @if (data(); as analytics) {
          <p class="updated-label">
            {{ relative(analytics.generatedAt) }} · {{ analytics.from }} to {{ analytics.to }}
          </p>
          <section class="analytics-kpis" aria-label="Analytics summary">
            <article>
              <span>Work Logs</span><strong>{{ analytics.workActivity.count }}</strong>
            </article>
            <article>
              <span>Relevant JIRAs</span><strong>{{ analytics.spillSummary.distinctJiras }}</strong>
            </article>
            <article>
              <span>JIRAs with spill</span><strong>{{ analytics.spillSummary.jirasWithAnySpill }}</strong>
            </article>
            <article>
              <span>Spill rate</span><strong>{{ percent(analytics.spillSummary.spillPercentage) }}</strong>
            </article>
            <article>
              <span>Total spill events</span><strong>{{ analytics.spillSummary.totalSpillEvents }}</strong>
            </article>
          </section>
          <section class="analytics-section">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">Work activity</p>
                <h2>Work Logs over time</h2>
              </div>
            </div>
            @if (analytics.workActivity.count) {
              <div class="analytics-chart-grid">
                <app-analytics-chart [model]="workChart()!" /><app-analytics-chart
                  [model]="categoryChart()!" /><app-analytics-chart [model]="typeChart()!" />
              </div>
            } @else {
              <p class="empty-state">No Work Logs in this range.</p>
            }
          </section>
          <section class="analytics-section">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">Spill analysis</p>
                <h2>Historical spill behavior</h2>
              </div>
            </div>
            <p class="analytics-explainer">
              Spill rate is the percentage of relevant JIRAs in selected Sprints that moved from a selected Sprint to a
              later Sprint. Selected-period events come from Sprints in this range.
            </p>
            @if (analytics.spillTrend; as trend) {
              <article class="spill-trend" [class]="'spill-trend ' + trend.direction">
                <strong>Spill trend</strong
                ><span
                  >{{ trend.direction === 'improving' ? '↓' : trend.direction === 'worsening' ? '↑' : '→' }}
                  {{ trendChange(trend.changePercentagePoints) }}</span
                ><b>{{
                  trend.direction === 'improving'
                    ? 'Improving'
                    : trend.direction === 'worsening'
                      ? 'Worsening'
                      : 'Unchanged'
                }}</b>
              </article>
            } @else {
              <p class="empty-state">At least two Sprints with JIRAs are needed for a spill trend.</p>
            }
            @if (analytics.sprints.length) {
              <div class="analytics-chart-grid">
                <app-analytics-chart [model]="spillRateChart()!" /><app-analytics-chart
                  [model]="spillDirectionChart()!" />
              </div>
            } @else {
              <p class="empty-state">No Sprint history overlaps this range.</p>
            }
            @if (!analytics.spillSummary.totalSpillEvents) {
              <p class="empty-state">No outgoing spill events in this range.</p>
            }
          </section>
          <section class="analytics-section">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">Capacity</p>
                <h2>Capacity planning</h2>
              </div>
            </div>
            @if (conflictPairs()) {
              <p class="analytics-warning" role="status">
                {{ conflictPairs() }} Sprint/JIRA allocation conflicts affect capacity totals.
              </p>
            }
            @if (analytics.sprints.length) {
              <div class="analytics-chart-grid">
                <app-analytics-chart [model]="capacityChart()!" /><app-analytics-chart [model]="utilizationChart()!" />
              </div>
            } @else {
              <p class="empty-state">No Sprint history overlaps this range.</p>
            }
          </section>
          <section class="analytics-section">
            <div class="section-title-row">
              <div>
                <p class="eyebrow">Top spilled JIRAs</p>
                <h2>Recurring spillover</h2>
              </div>
            </div>
            @if (analytics.topSpilledJiras.length) {
              <div class="analytics-chart-grid one-wide"><app-analytics-chart [model]="topSpilledChart()!" /></div>
              <div class="top-spilled-list" aria-label="Top spilled JIRAs exact values">
                @for (jira of analytics.topSpilledJiras; track jira.id) {
                  <article>
                    <a [routerLink]="['/app/jiras', jira.jiraKey]">{{ jira.jiraKey }}</a
                    ><span>{{ jira.summary }}</span
                    ><small
                      >{{ jira.fullHistorySpillCount }} full-history spills ·
                      {{ jira.selectedRangeOutgoingSpillCount }} selected-range outgoing spills</small
                    >
                  </article>
                }
              </div>
            } @else {
              <p class="empty-state">No spilled JIRAs are available for these Sprints.</p>
            }
          </section>
        }
      </main></ion-content
    >`,
})
export class AnalyticsPage {
  private readonly service = inject(AnalyticsService);
  private version = 0;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly data = signal<HistoricalAnalyticsResponse | null>(null);
  readonly preset = signal<AnalyticsRangePreset>('30');
  readonly form = new FormGroup({
    from: new FormControl(analyticsRange('30').from, { nonNullable: true }),
    to: new FormControl(analyticsRange('30').to, { nonNullable: true }),
  });
  readonly workChart = computed(() => (this.data() ? analyticsCharts.workActivity(this.data()!) : null));
  readonly categoryChart = computed(() => (this.data() ? analyticsCharts.categoryMix(this.data()!) : null));
  readonly typeChart = computed(() => (this.data() ? analyticsCharts.typeMix(this.data()!) : null));
  readonly spillRateChart = computed(() => (this.data() ? analyticsCharts.spillRate(this.data()!) : null));
  readonly spillDirectionChart = computed(() => (this.data() ? analyticsCharts.spillDirection(this.data()!) : null));
  readonly capacityChart = computed(() => (this.data() ? analyticsCharts.capacity(this.data()!) : null));
  readonly utilizationChart = computed(() => (this.data() ? analyticsCharts.utilization(this.data()!) : null));
  readonly topSpilledChart = computed(() => (this.data() ? analyticsCharts.topSpilled(this.data()!) : null));
  readonly conflictPairs = computed(
    () => this.data()?.sprints.reduce((total, sprint) => total + sprint.allocationConflictPairs, 0) ?? 0,
  );
  readonly relative = (value: string) => formatRelativeTime(value);

  constructor() {
    addIcons({ refreshOutline });
    void this.load();
  }
  decimal(value: number): string {
    return new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value);
  }
  percent(value: number): string {
    return `${this.decimal(value)}%`;
  }
  trendChange(value: number): string {
    return `${this.decimal(this.absolute(value))} percentage points`;
  }
  absolute(value: number): number {
    return Math.abs(value);
  }
  rangeChanged(value: string): void {
    if (value !== '30' && value !== '90' && value !== '6m' && value !== '1y' && value !== 'custom') return;
    const preset = value as AnalyticsRangePreset;
    this.preset.set(preset);
    if (preset === 'custom') return;
    this.form.setValue(analyticsRange(preset));
    void this.load();
  }
  applyRange(): void {
    this.preset.set('custom');
    void this.load();
  }
  async load(refresh = false): Promise<void> {
    const { from, to } = this.form.getRawValue();
    const validation = validateAnalyticsRange(from, to);
    if (validation) {
      this.error.set(validation);
      return;
    }
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await firstValueFrom(this.service.load(from, to, refresh));
      if (version === this.version) this.data.set(response);
    } catch (error) {
      if (version === this.version) this.error.set(this.message(error));
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }
  private message(error: unknown): string {
    switch (apiErrorCode(error)) {
      case 'ANALYTICS_DATE_INVALID':
        return 'Choose valid From and To dates.';
      case 'ANALYTICS_RANGE_INVALID':
        return 'From date must be on or before To date.';
      case 'ANALYTICS_RANGE_TOO_LARGE':
        return 'Choose a range of 370 days or less.';
      case 'ANALYTICS_UPSTREAM_ERROR':
        return 'Historical analytics is temporarily unavailable. Please retry.';
      default:
        return 'Historical analytics is temporarily unavailable. Please retry.';
    }
  }
}
