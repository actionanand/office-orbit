import { Component, computed, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonModal,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  analyticsOutline,
  calendarOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  filterOutline,
  listOutline,
  printOutline,
  refreshOutline,
} from 'ionicons/icons';
import { WorkLogExportComponent } from './work-log-export.component';
import { JiraLinkComponent } from '../jiras/jira-link.component';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { WorkLog } from '../../shared/models/api.models';
import { formatDate, formatRelativeTime, names } from '../../shared/utils/format';
import { calendarDays, currentMonth } from './calendar';
import { WorkLogFilters, WorkLogStore, WorkLogViewMode } from './work-log.store';

@Component({
  selector: 'app-work-log',
  imports: [
    WorkLogExportComponent,
    IonModal,
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    JiraLinkComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    StatePanelComponent,
    StatusBadgeComponent,
  ],
  template: `<ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Work Log</ion-title>
        <ion-button slot="end" fill="clear" aria-label="Refresh Work Log" (click)="refresh()">
          <ion-icon slot="icon-only" name="refresh-outline" />
        </ion-button>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="page-wrap resource-page work-log-page">
        <div class="page-action-row">
          <app-page-header
            title="Work Log"
            description="A focused history of your effort, decisions, and accomplishments." />
          <div class="page-actions no-print">
            <ion-button fill="clear" routerLink="/app/analytics" [queryParams]="{ section: 'work-activity' }">
              <ion-icon name="analytics-outline" slot="start" />View work trends
            </ion-button>
            <ion-button fill="outline" (click)="print()"
              ><ion-icon name="print-outline" slot="start" />Print / Export</ion-button
            >
          </div>
        </div>

        <div class="work-log-controls no-print">
          <ion-segment class="view-switcher" [value]="store.mode()" (ionChange)="setMode($event.detail.value)">
            <ion-segment-button value="list" aria-label="List view" title="List view"
              ><ion-icon name="list-outline" aria-hidden="true"
            /></ion-segment-button>
            <ion-segment-button value="calendar" aria-label="Calendar view" title="Calendar view"
              ><ion-icon name="calendar-outline" aria-hidden="true"
            /></ion-segment-button>
          </ion-segment>
          <ion-segment class="data-switcher" [value]="store.selectedPath()" (ionChange)="setPath($event.detail.value)">
            <ion-segment-button value="/api/work-logs">All</ion-segment-button>
            <ion-segment-button value="/api/work-logs/appraisal">Appraisal</ion-segment-button>
          </ion-segment>
        </div>

        @if (store.selectedPath() === '/api/work-logs') {
          <ion-button class="filter-open" fill="outline" (click)="filtersOpen.set(true)"
            ><ion-icon name="filter-outline" slot="start" />Filters</ion-button
          >
          <ion-modal class="filter-modal" [isOpen]="filtersOpen()" (didDismiss)="filtersOpen.set(false)"
            ><ng-template
              ><ion-header
                ><ion-toolbar
                  ><ion-title>Filters</ion-title
                  ><ion-button slot="end" fill="clear" aria-label="Close filters" (click)="filtersOpen.set(false)"
                    ><ion-icon name="close-outline" slot="icon-only" /></ion-button></ion-toolbar></ion-header
              ><ion-content>
                <form class="filters compact-filters" [formGroup]="form" (ngSubmit)="applyFilters()">
                  @if (store.mode() === 'list') {
                    <label>From<input type="date" formControlName="from" /></label>
                    <label>To<input type="date" formControlName="to" /></label>
                  }
                  <label>Category<input type="text" formControlName="category" /></label>
                  <label>Type<input type="text" formControlName="type" /></label>
                  <label>Work mode<input type="text" formControlName="workMode" /></label>
                  <ion-button type="submit" fill="outline">Apply filters</ion-button>
                  <ion-button type="button" fill="clear" (click)="clearFilters()">Clear</ion-button>
                </form>
              </ion-content></ng-template
            ></ion-modal
          >
        }

        <label class="loaded-search no-print"
          >Search loaded items<input
            type="search"
            [value]="store.search()"
            (input)="searchChanged($event)"
            placeholder="Filter this page"
        /></label>

        @if (store.lastUpdated(); as updatedAt) {
          <p class="updated-label">{{ relative(updatedAt) }}</p>
        }

        @if (store.mode() === 'calendar') {
          <section class="calendar-panel no-print" aria-labelledby="calendar-heading">
            <div class="calendar-toolbar">
              <ion-button fill="clear" aria-label="Previous month" (click)="moveMonth(-1)"
                ><ion-icon slot="icon-only" name="chevron-back-outline"
              /></ion-button>
              <h2 id="calendar-heading">{{ monthHeading() }}</h2>
              <ion-button fill="clear" aria-label="Next month" (click)="moveMonth(1)"
                ><ion-icon slot="icon-only" name="chevron-forward-outline"
              /></ion-button>
              <ion-button fill="outline" size="small" (click)="goToday()">Today</ion-button>
            </div>
            <div class="calendar-weekdays" aria-hidden="true">
              @for (day of weekdays; track day) {
                <span>{{ day }}</span>
              }
            </div>
            <div class="calendar-grid">
              @for (day of days(); track $index) {
                @if (day.date) {
                  <button
                    type="button"
                    [class.today]="day.date === today"
                    [class.selected]="day.date === store.selectedDate()"
                    [attr.aria-label]="calendarLabel(day.date)"
                    (click)="selectDate(day.date)">
                    <span>{{ day.day }}</span>
                    @if (countFor(day.date) > 0) {
                      <small><i aria-hidden="true"></i>{{ countFor(day.date) }}</small>
                    }
                  </button>
                } @else {
                  <span class="calendar-blank"></span>
                }
              }
            </div>
          </section>
        }

        @if (store.loading()) {
          <app-loading-skeleton [rows]="5" />
        } @else if (store.error() || !displayedLogs().length) {
          <app-state-panel [error]="store.error()" [message]="emptyMessage()" (retry)="refresh()" />
        } @else {
          <p class="result-count no-print">
            {{ displayedLogs().length }} work logs{{ store.hasMore() ? ' loaded' : '' }}
          </p>
          <section class="activity-list printable-list" aria-label="Work log history">
            @for (item of displayedLogs(); track item.id; let index = $index) {
              @if (showDateHeader(index)) {
                <h2 class="date-group">{{ date(item.date) || 'Date not set' }}</h2>
              }
              <article class="activity-row print-record">
                <button class="activity-main" type="button" (click)="openDetail(item)">
                  <strong>{{ item.update || 'Work update' }}</strong>
                  <span class="meta-line">
                    @if (item.type) {
                      <span>{{ item.type }}</span>
                    }
                    @if (item.category) {
                      <span>{{ item.category }}</span>
                    }
                    @if (item.workMode) {
                      <span>{{ item.workMode }}</span>
                    }
                    @if (names(item.projects)) {
                      <span>{{ names(item.projects) }}</span>
                    }
                  </span>
                  @if (item.comment) {
                    <span class="preview print-notes"><strong>Comment:</strong> {{ item.comment }}</span>
                  }
                  @if (item.wentWrong) {
                    <span class="preview print-notes"><strong>Went wrong:</strong> {{ item.wentWrong }}</span>
                  }
                </button>
                <span class="row-badges">
                  @for (jira of item.jiras; track jira.id) {
                    <app-jira-link [jiraKey]="jira.key" />
                  }
                  @if (item.appraisal) {
                    <app-status-badge label="Appraisal" kind="success" />
                  }
                </span>
              </article>
            }
          </section>
        }

        @if (store.hasMore()) {
          <ion-button fill="outline" [disabled]="store.loadingMore()" (click)="store.load(false, true)">{{
            store.loadingMore() ? 'Loading...' : 'Load more'
          }}</ion-button>
        }
      </main>

      @if (selectedLog(); as item) {
        <div class="detail-backdrop no-print" (click)="closeDetail()" aria-hidden="true"></div>
        <aside class="detail-sheet no-print" role="dialog" aria-modal="true" aria-labelledby="work-log-detail-title">
          <ion-button class="close-button" fill="clear" aria-label="Close work log details" (click)="closeDetail()"
            ><ion-icon slot="icon-only" name="close-outline"
          /></ion-button>
          <p class="eyebrow">Work log · {{ date(item.date) }}</p>
          <h2 id="work-log-detail-title">{{ item.update || 'Work update' }}</h2>
          <section class="detail-section">
            <h3>Overview</h3>
            <dl class="detail-grid">
              @if (item.category) {
                <div>
                  <dt>Category</dt>
                  <dd>{{ item.category }}</dd>
                </div>
              }
              @if (item.type) {
                <div>
                  <dt>Type</dt>
                  <dd>{{ item.type }}</dd>
                </div>
              }
              @if (item.workMode) {
                <div>
                  <dt>Work mode</dt>
                  <dd>{{ item.workMode }}</dd>
                </div>
              }
              @if (names(item.projects)) {
                <div>
                  <dt>Project</dt>
                  <dd>{{ names(item.projects) }}</dd>
                </div>
              }
              @if (names(item.companies)) {
                <div>
                  <dt>Company</dt>
                  <dd>{{ names(item.companies) }}</dd>
                </div>
              }
              @if (names(item.teams)) {
                <div>
                  <dt>Team</dt>
                  <dd>{{ names(item.teams) }}</dd>
                </div>
              }
            </dl>
          </section>
          @if ((item.jiras?.length ?? 0) > 0 || (item.sprints?.length ?? 0) > 0) {
            <section class="detail-section">
              <h3>Related work</h3>
              @if (item.jiras?.length) {
                <div class="jira-reference-list">
                  @for (jira of item.jiras; track jira.id) {
                    <app-jira-link [jiraKey]="jira.key" [showExternal]="true" />
                  }
                </div>
              }
              @if (item.sprints?.length) {
                <p><strong>Sprints</strong><br />{{ names(item.sprints) }}</p>
              }
            </section>
          }
          @if (item.comment || item.wentWrong) {
            <section class="detail-section">
              <h3>Notes</h3>
              @if (item.comment) {
                <h4>Comment</h4>
                <p>{{ item.comment }}</p>
              }
              @if (item.wentWrong) {
                <h4>Went wrong</h4>
                <p>{{ item.wentWrong }}</p>
              }
            </section>
          }
          @if (item.appraisal) {
            <section class="detail-section">
              <h3>Recognition</h3>
              <app-status-badge label="Appraisal item" kind="success" />
            </section>
          }
        </aside>
      }
      <app-work-log-export [open]="exportOpen()" (closed)="exportOpen.set(false)"
    /></ion-content>`,
})
export class WorkLogPage {
  readonly store = inject(WorkLogStore);
  readonly exportOpen = signal(false);
  readonly filtersOpen = signal(false);
  readonly selectedLog = signal<WorkLog | null>(null);
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly today = this.isoDate(new Date());
  readonly days = computed(() => calendarDays(this.store.month()));
  readonly monthHeading = computed(() =>
    new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
      new Date(`${this.store.month()}-01T00:00:00`),
    ),
  );
  readonly counts = computed(() => {
    const counts = new Map<string, number>();
    for (const item of this.store.visible()) if (item.date) counts.set(item.date, (counts.get(item.date) ?? 0) + 1);
    return counts;
  });
  readonly displayedLogs = computed(() => {
    const selectedDate = this.store.mode() === 'calendar' ? this.store.selectedDate() : null;
    return selectedDate ? this.store.visible().filter(item => item.date === selectedDate) : this.store.visible();
  });
  readonly form = new FormGroup({
    from: new FormControl(this.store.filters().from, { nonNullable: true }),
    to: new FormControl(this.store.filters().to, { nonNullable: true }),
    category: new FormControl(this.store.filters().category, { nonNullable: true }),
    type: new FormControl(this.store.filters().type, { nonNullable: true }),
    workMode: new FormControl(this.store.filters().workMode, { nonNullable: true }),
  });
  readonly date = formatDate;
  readonly names = names;
  readonly relative = (timestamp: number) => formatRelativeTime(new Date(timestamp).toISOString());

  constructor() {
    addIcons({
      analyticsOutline,
      calendarOutline,
      chevronBackOutline,
      chevronForwardOutline,
      closeOutline,
      filterOutline,
      listOutline,
      printOutline,
      refreshOutline,
    });
    void this.store.load(false);
  }

  setMode(value: string | number | undefined): void {
    if (value === 'list' || value === 'calendar') this.store.setMode(value);
  }
  setPath(value: string | number | undefined): void {
    if (typeof value === 'string') {
      this.store.selectedPath.set(value);
      void this.store.load(false);
    }
  }
  searchChanged(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.store.search.set(event.target.value);
  }
  applyFilters(): void {
    const filters = this.form.getRawValue() satisfies WorkLogFilters;
    if (filters.from && filters.to && filters.from > filters.to) {
      this.store.error.set('The start date must be before the end date.');
      return;
    }
    this.store.filters.set(filters);
    this.filtersOpen.set(false);
    void this.store.load(false);
  }
  clearFilters(): void {
    this.form.reset({ from: '', to: '', category: '', type: '', workMode: '' });
    this.store.filters.set(this.form.getRawValue());
    void this.store.load(false);
  }
  refresh(): void {
    void this.store.load(true);
  }
  moveMonth(offset: number): void {
    this.store.moveMonth(offset);
  }
  goToday(): void {
    this.store.month.set(currentMonth());
    this.store.selectedDate.set(this.today);
    void this.store.load(false);
  }
  selectDate(date: string): void {
    this.store.selectedDate.set(date);
  }
  countFor(date: string): number {
    return this.counts().get(date) ?? 0;
  }
  calendarLabel(date: string): string {
    const count = this.countFor(date);
    return `${formatDate(date)}${count ? `, ${count} work log${count === 1 ? '' : 's'}` : ''}`;
  }
  showDateHeader(index: number): boolean {
    const logs = this.displayedLogs();
    return index === 0 || logs[index - 1]?.date !== logs[index]?.date;
  }
  openDetail(item: WorkLog): void {
    this.selectedLog.set(item);
  }
  closeDetail(): void {
    this.selectedLog.set(null);
  }
  emptyMessage(): string {
    return this.store.search() ? 'No loaded Work Logs match your search.' : 'No work logged for this period.';
  }
  print(): void {
    this.exportOpen.set(true);
  }
  private isoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
