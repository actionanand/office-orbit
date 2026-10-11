import { Component, computed, inject, input, output, signal } from '@angular/core';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronBackOutline, chevronForwardOutline, closeOutline, copyOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { formatDate, names } from '../../shared/utils/format';
import { calendarDays, currentMonth, monthRange, shiftMonth } from '../work-logs/calendar';
import { ReleaseCalendarDate, ReleaseDateType, ReleaseItem } from '../../shared/models/api.models';
import { JiraLinkComponent } from '../jiras/jira-link.component';
import { spilloverLabel } from '../../shared/utils/jira';
import { OrbitLoaderComponent } from '../../shared/components/orbit-loader.component';
import { ReleaseService } from './releases.service';

@Component({
  selector: 'app-release-calendar',
  imports: [
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    JiraLinkComponent,
    OrbitLoaderComponent,
  ],
  template: `<ion-modal
    class="release-calendar-modal"
    [isOpen]="open()"
    (didPresent)="loadSummary()"
    (didDismiss)="closed.emit()"
    ><ng-template>
      <ion-header class="ion-no-border"
        ><ion-toolbar
          ><ion-title>Release calendar</ion-title
          ><ion-button slot="end" fill="clear" aria-label="Close calendar" (click)="closed.emit()"
            ><ion-icon slot="icon-only" name="close-outline" /></ion-button></ion-toolbar
      ></ion-header>
      <ion-content
        ><section class="release-calendar">
          <ion-segment
            class="release-calendar-type-selector"
            [value]="dateType()"
            (ionChange)="changeType($event.detail.value)"
            ><ion-segment-button value="announcement">Announcement</ion-segment-button
            ><ion-segment-button value="release">Release</ion-segment-button></ion-segment
          >
          <div class="release-calendar-month">
            <ion-button fill="clear" aria-label="Previous month" (click)="shift(-1)"
              ><ion-icon slot="icon-only" name="chevron-back-outline" /></ion-button
            ><strong>{{ monthLabel() }}</strong
            ><ion-button fill="clear" aria-label="Next month" (click)="shift(1)"
              ><ion-icon slot="icon-only" name="chevron-forward-outline"
            /></ion-button>
          </div>
          @if (loadingSummary()) {
            <div class="release-calendar-loading" aria-live="polite">
              <app-orbit-loader [size]="1.15" />
              <span>Loading calendar…</span>
            </div>
          } @else if (summaryError()) {
            <p class="form-error" role="alert">{{ summaryError() }}</p>
          } @else {
            <div class="release-calendar-weekdays" aria-hidden="true">
              @for (day of weekdays; track day) {
                <span>{{ day }}</span>
              }
            </div>
            <div class="release-calendar-grid">
              @for (day of days(); track $index) {
                @if (day.date) {
                  <button
                    type="button"
                    [disabled]="!count(day.date)"
                    [class.active]="count(day.date) > 0"
                    [class.selected]="selectedDate() === day.date"
                    [attr.aria-label]="dayLabel(day.date)"
                    (click)="selectDate(day.date)">
                    <span>{{ day.day }}</span>
                    @if (count(day.date)) {
                      <small>{{ count(day.date) }}</small>
                    }
                  </button>
                } @else {
                  <span></span>
                }
              }
            </div>
          }
          @if (selectedDate()) {
            <section class="release-calendar-results" aria-live="polite">
              <h2>{{ dateLabel() }}: {{ date(selectedDate()) }}</h2>
              @if (loadingResults()) {
                <p>Loading releases…</p>
              } @else if (resultError()) {
                <p class="form-error">{{ resultError() }}</p>
              } @else {
                <div class="release-calendar-copy-toolbar" aria-live="polite">
                  <span>{{ selectedIds().length ? selectedIds().length + ' selected' : 'Select releases' }}</span>
                  <span>
                    <ion-button fill="clear" size="small" (click)="selectAllResults()">Select all</ion-button>
                    @if (selectedIds().length) {
                      <ion-button fill="clear" size="small" (click)="clearSelection()">Clear</ion-button>
                      <ion-button size="small" (click)="requestCopy()"
                        ><ion-icon name="copy-outline" slot="start" />Copy release notes</ion-button
                      >
                    }
                  </span>
                </div>
                @for (item of results(); track item.id) {
                  <article>
                    <label class="release-calendar-result-heading">
                      <input
                        type="checkbox"
                        [checked]="isSelected(item)"
                        [attr.aria-label]="'Select release ' + (item.componentName || item.releaseItem)"
                        (change)="selectionChanged(item, $event)" />
                      <strong>{{ item.componentName || item.releaseItem }}</strong>
                    </label>
                    <span>{{ item.deploymentType || 'Not set' }} · {{ item.versionNumber || 'Not set' }}</span>
                    <span>Branch: {{ item.branch || 'Not set' }}</span>
                    @if (item.jiras?.length) {
                      <span class="jira-reference-list">
                        @for (jira of item.jiras; track jira.id) {
                          <app-jira-link [jiraKey]="jira.key" [showExternal]="true" />
                        }
                      </span>
                    } @else {
                      <span>JIRAs: Not linked</span>
                    }
                    @if (item.sprints?.length) {
                      <span>Sprints: {{ names(item.sprints) }}</span>
                    } @else {
                      <span>Sprints: None</span>
                    }
                    @if (item.spilloverCount) {
                      <span>{{ spillover(item.spilloverCount) }}</span>
                    }
                  </article>
                } @empty {
                  <p>No releases were returned for this date.</p>
                }
              }
            </section>
          }
        </section></ion-content
      >
    </ng-template></ion-modal
  >`,
})
export class ReleaseCalendarComponent {
  readonly open = input(false);
  readonly closed = output<void>();
  readonly copyRequested = output<ReleaseItem[]>();
  private readonly releases = inject(ReleaseService);
  private summaryRequest?: Subscription;
  private resultRequest?: Subscription;
  readonly dateType = signal<ReleaseDateType>('announcement');
  readonly month = signal(currentMonth());
  readonly dates = signal<ReleaseCalendarDate[]>([]);
  readonly selectedDate = signal<string | null>(null);
  readonly results = signal<ReleaseItem[]>([]);
  readonly selectedIds = signal<string[]>([]);
  readonly selectedResults = computed(() => {
    const ids = new Set(this.selectedIds());
    return this.results().filter(item => ids.has(item.id));
  });
  readonly loadingResults = signal(false);
  readonly loadingSummary = signal(false);
  readonly summaryError = signal('');
  readonly resultError = signal('');
  readonly days = computed(() => calendarDays(this.month()));
  readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(
      new Date(`${this.month()}-01T00:00:00`),
    ),
  );
  readonly weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  readonly date = formatDate;
  readonly names = names;
  readonly spillover = spilloverLabel;
  constructor() {
    addIcons({ chevronBackOutline, chevronForwardOutline, closeOutline, copyOutline });
  }
  count(date: string): number {
    return this.dates().find(item => item.date === date)?.count ?? 0;
  }
  dayLabel(date: string): string {
    const count = this.count(date);
    return `${formatDate(date)}, ${count} release${count === 1 ? '' : 's'}`;
  }
  dateLabel(): string {
    return this.dateType() === 'announcement' ? 'Announcement date' : 'Release date';
  }
  changeType(value: string | number | undefined): void {
    if (value === 'announcement' || value === 'release') {
      this.dateType.set(value);
      this.loadSummary();
    }
  }
  shift(offset: number): void {
    this.month.set(shiftMonth(this.month(), offset));
    this.loadSummary();
  }
  loadSummary(): void {
    const { from, to } = monthRange(this.month());
    this.selectedDate.set(null);
    this.results.set([]);
    this.clearSelection();
    this.resultRequest?.unsubscribe();
    this.summaryRequest?.unsubscribe();
    this.summaryError.set('');
    this.dates.set([]);
    this.loadingSummary.set(true);
    this.summaryRequest = this.releases.calendar(this.dateType(), from, to).subscribe({
      next: value => {
        this.dates.set(value.dates);
        this.loadingSummary.set(false);
      },
      error: () => {
        this.dates.set([]);
        this.summaryError.set('Calendar dates could not be loaded.');
        this.loadingSummary.set(false);
      },
    });
  }
  selectDate(date: string): void {
    if (!this.count(date)) return;
    this.selectedDate.set(date);
    this.results.set([]);
    this.clearSelection();
    this.resultError.set('');
    this.loadingResults.set(true);
    this.resultRequest?.unsubscribe();
    this.resultRequest = this.releases.byDate(this.dateType(), date).subscribe({
      next: value => {
        if (this.selectedDate() === date) this.results.set(value);
        this.loadingResults.set(false);
      },
      error: () => {
        if (this.selectedDate() === date) this.resultError.set('Releases for this date could not be loaded.');
        this.loadingResults.set(false);
      },
    });
  }

  isSelected(item: ReleaseItem): boolean {
    return this.selectedIds().includes(item.id);
  }

  selectionChanged(item: ReleaseItem, event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) return;
    this.selectedIds.update(ids =>
      target.checked ? (ids.includes(item.id) ? ids : [...ids, item.id]) : ids.filter(id => id !== item.id),
    );
  }

  selectAllResults(): void {
    this.selectedIds.set(this.results().map(item => item.id));
  }

  clearSelection(): void {
    this.selectedIds.set([]);
  }

  requestCopy(): void {
    const selected = this.selectedResults();
    if (selected.length) this.copyRequested.emit(selected);
  }
}
