import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { DashboardService } from '../dashboard/dashboard.service';
import { DashboardResponse } from '../../shared/models/api.models';
import { BarChartComponent } from '../../shared/components/bar-chart.component';
import { AnalyticsService, aggregateWork } from './analytics.service';
import { localDate } from '../work-logs/work-log-export.component';
import { formatRelativeTime } from '../../shared/utils/format';

@Component({
  selector: 'app-analytics',
  imports: [ReactiveFormsModule, IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar, BarChartComponent],
  template: `<ion-header
      ><ion-toolbar
        ><ion-title>Analytics</ion-title
        ><ion-button slot="end" fill="clear" aria-label="Refresh analytics" (click)="load(true)"
          ><ion-icon name="refresh-outline" slot="icon-only" /></ion-button></ion-toolbar
    ></ion-header>
    <ion-content
      ><main class="page-wrap analytics-page">
        <h1>Analytics</h1>
        <p class="muted">Your work activity and current sprint at a glance.</p>
        <form class="analytics-range" [formGroup]="form" (ngSubmit)="load()">
          <label
            >Range<select (change)="rangeChanged($event)">
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="180">6 months</option>
              <option value="custom">Custom</option>
            </select></label
          >
          <label>From<input type="date" formControlName="from" /></label
          ><label>To<input type="date" formControlName="to" /></label>
          <ion-button type="submit" fill="outline">Apply</ion-button>
        </form>
        @if (loading()) {
          <p role="status">Loading work activity...</p>
        }
        @if (error()) {
          <p role="alert">{{ error() }}</p>
        }
        @if (activity(); as data) {
          <p class="updated-label">{{ relative(data.updatedAt) }} · {{ data.count }} work logs</p>
          @if (data.count) {
            <div class="analytics-grid" id="work-activity">
              <app-bar-chart label="Work logs by week" [values]="data.weeks" />
              <app-bar-chart label="Category mix" [values]="data.categories" />
              <app-bar-chart label="Work logs by type" [values]="data.types" />
            </div>
          } @else {
            <p>No Work Logs match this period.</p>
          }
        }
        @if (dashboard(); as overview) {
          <div class="analytics-grid">
            @if (overview.currentSprint; as sprint) {
              <section class="native-chart">
                <h2>Current sprint health</h2>
                <p>{{ sprint.sprint }}</p>
                <app-bar-chart label="Sprint days" [values]="sprintDays()" />
                <p>
                  Capacity {{ sprint.capacityDays }} · Allocated {{ sprint.allocatedDays }} · Remaining
                  {{ sprint.remainingDays }}
                </p>
              </section>
            }
            <app-bar-chart label="JIRA attention" [values]="attention()" />
          </div>
        }
        @if (dashboardError()) {
          <p role="status">{{ dashboardError() }}</p>
        }
      </main></ion-content
    >`,
})
export class AnalyticsPage {
  private readonly service = inject(AnalyticsService);
  private readonly dashboardService = inject(DashboardService);
  private version = 0;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly dashboardError = signal('');
  readonly dashboard = signal<DashboardResponse | null>(null);
  readonly activity = signal<(ReturnType<typeof aggregateWork> & { count: number; updatedAt: number }) | null>(null);
  readonly form = new FormGroup({
    from: new FormControl(this.startDate(30), { nonNullable: true }),
    to: new FormControl(localDate(new Date()), { nonNullable: true }),
  });
  readonly relative = (time: number) => formatRelativeTime(new Date(time).toISOString());
  readonly sprintDays = computed(() => {
    const sprint = this.dashboard()?.currentSprint;
    return sprint
      ? [
          { label: 'Capacity', value: sprint.capacityDays },
          { label: 'Allocated', value: sprint.allocatedDays },
          { label: 'Remaining', value: sprint.remainingDays },
        ]
      : [];
  });
  readonly attention = computed(() => {
    const summary = this.dashboard()?.jiraSummary;
    return summary
      ? [
          { label: 'Active', value: summary.active },
          { label: 'Blocked', value: summary.blocked },
          { label: 'Spillover', value: summary.spillovers },
          { label: 'Demo pending', value: summary.demoPending },
        ]
      : [];
  });
  constructor() {
    addIcons({ refreshOutline });
    void this.load();
    void firstValueFrom(this.dashboardService.get())
      .then(value => this.dashboard.set(value))
      .catch(() => this.dashboardError.set('Current sprint information is unavailable.'));
  }
  rangeChanged(event: Event): void {
    if (!(event.target instanceof HTMLSelectElement) || event.target.value === 'custom') return;
    this.form.setValue({ from: this.startDate(Number(event.target.value)), to: localDate(new Date()) });
    void this.load();
  }
  async load(refresh = false): Promise<void> {
    const { from, to } = this.form.getRawValue();
    if (!from || !to || from > to) {
      this.error.set('Choose a valid date range.');
      return;
    }
    const version = ++this.version;
    this.loading.set(true);
    this.error.set('');
    this.activity.set(null);
    try {
      const data = await firstValueFrom(this.service.load(from, to, refresh));
      if (version === this.version) this.activity.set(data);
    } catch {
      if (version === this.version) this.error.set('Unable to load work activity. Please retry.');
    } finally {
      if (version === this.version) this.loading.set(false);
    }
  }
  private startDate(days: number): string {
    const date = new Date();
    if (days === 180) {
      date.setMonth(date.getMonth() - 6);
      date.setDate(date.getDate() + 1);
    } else date.setDate(date.getDate() - days + 1);
    return localDate(date);
  }
}
