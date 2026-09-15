import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { refreshOutline } from 'ionicons/icons';
import { catchError, forkJoin, map, of } from 'rxjs';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { Sprint } from '../../shared/models/api.models';
import { DashboardService } from '../dashboard/dashboard.service';
import {
  EVENT_LABELS,
  OfficeEvent,
  OfficeEventType,
  Period,
  eventsInWindow,
  monthWindow,
  sprintWindow,
} from './office-event';
import { enabledOfficeEventTypes } from './office-event-visibility';
import { OfficeEventsService } from './office-events.service';

@Component({
  selector: 'app-office-events',
  imports: [
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonLabel,
    IonSegment,
    IonSegmentButton,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    StatePanelComponent,
  ],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar>
        <ion-title>Office Events</ion-title>
        @if (availableTypes().length) {
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Refresh Office Events"
            [disabled]="loading()"
            (click)="load(true)">
            <ion-icon name="refresh-outline" slot="icon-only" />
          </ion-button>
        }</ion-toolbar
    ></ion-header>
    <ion-content
      ><main class="page-wrap office-events-page">
        @if (availableTypes().length) {
          <app-page-header
            title="Office Events"
            description="Holidays, important days and rota relevant to your current period." />
          <ion-segment [value]="period()" (ionChange)="changePeriod($event.detail.value)" aria-label="Event period">
            <ion-segment-button value="sprint"><ion-label>This Sprint</ion-label></ion-segment-button>
            <ion-segment-button value="month"><ion-label>This Month</ion-label></ion-segment-button>
            <ion-segment-button value="next-month"><ion-label>Next Month</ion-label></ion-segment-button>
          </ion-segment>
          <ion-select
            label="Event type"
            labelPlacement="stacked"
            fill="outline"
            interface="alert"
            [value]="eventType()"
            (ionChange)="changeEventType($event.detail.value)">
            <ion-select-option value="all">All</ion-select-option>
            @for (type of availableTypes(); track type) {
              <ion-select-option [value]="type">{{ labels[type] }}</ion-select-option>
            }
          </ion-select>
          @if (loading()) {
            <app-loading-skeleton />
          } @else {
            @for (warning of warnings(); track warning) {
              <p class="content-warning" role="status">{{ warning }}</p>
            }
            @if (period() === 'sprint' && sprintError()) {
              <app-state-panel [error]="sprintError()" (retry)="load(true)" />
            } @else if (period() === 'sprint' && !sprint()) {
              <app-state-panel
                title="No active Sprint"
                message="Choose This Month or Next Month to view office events." />
            } @else if (!window()) {
              <app-state-panel
                title="Sprint dates unavailable"
                message="The active Sprint needs valid start and end dates to show events." />
            } @else {
              <p class="office-events-period">{{ periodLabel() }}</p>
              @if (!visibleEvents().length) {
                <app-state-panel
                  [title]="emptyTitle()"
                  message="No matching events were found in the available sources." />
              } @else {
                <ol class="office-event-list" aria-label="Office events in chronological order">
                  @for (event of visibleEvents(); track event.id) {
                    <li class="office-event-row" [class.past-event]="isPastEvent(event)">
                      <div class="office-event-heading">
                        <div class="office-event-date">{{ eventDate(event) }}</div>
                        <div class="office-event-badges">
                          @if (relativeDateLabel(event); as relativeDate) {
                            <span class="status-badge office-event-relative">{{ relativeDate }}</span>
                          }
                          <span [class]="'status-badge office-event-type ' + event.type">{{ labels[event.type] }}</span>
                        </div>
                      </div>
                      <div class="office-event-body">
                        <h2>{{ event.title }}</h2>
                        @if (event.day || event.tamilDay) {
                          <p class="office-event-calendar">
                            @if (event.day) {
                              <span>{{ event.day }}</span>
                            }
                            @if (event.tamilDay) {
                              <span class="tamil-day">{{ event.day ? ' ' : '' }}({{ event.tamilDay }})</span>
                            }
                          </p>
                        }
                        @if (event.othersInvolved) {
                          <p class="office-event-with"><span>With:</span> {{ event.othersInvolved }}</p>
                        }
                        @if (event.comments) {
                          <p class="office-event-comments">{{ event.comments }}</p>
                        }
                      </div>
                    </li>
                  }
                </ol>
              }
            }
          }
        }
      </main></ion-content
    >`,
  styleUrl: './office-events.page.scss',
})
export class OfficeEventsPage {
  private readonly api = inject(OfficeEventsService);
  private readonly dashboard = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private generation = 0;
  readonly period = signal<Period>('sprint');
  readonly eventType = signal<OfficeEventType | 'all'>('all');
  readonly today = signal(new Date());
  readonly loading = signal(true);
  readonly events = signal<OfficeEvent[]>([]);
  readonly warnings = signal<string[]>([]);
  readonly sprint = signal<Sprint | null>(null);
  readonly sprintError = signal('');
  readonly labels = EVENT_LABELS;
  readonly availableTypes = computed(() => enabledOfficeEventTypes());
  readonly window = computed(() =>
    this.period() === 'sprint'
      ? sprintWindow(this.sprint())
      : monthWindow(this.today().getFullYear(), this.today().getMonth() + (this.period() === 'month' ? 1 : 2)),
  );
  readonly visibleEvents = computed(() => {
    const window = this.window();
    return window
      ? eventsInWindow(this.events(), window).filter(
          event =>
            this.availableTypes().includes(event.type) &&
            (this.eventType() === 'all' || event.type === this.eventType()),
        )
      : [];
  });
  readonly periodLabel = computed(() => {
    const window = this.window();
    return window ? `${this.formatDate(window.startDate)} – ${this.formatDate(window.endDate)}` : '';
  });
  readonly emptyTitle = computed(
    () =>
      ({ sprint: 'No events this Sprint', month: 'No events this month', 'next-month': 'No events next month' })[
        this.period()
      ],
  );

  constructor() {
    addIcons({ refreshOutline });
    this.load();
  }

  changePeriod(value: unknown): void {
    if (value === 'sprint' || value === 'month' || value === 'next-month') {
      this.today.set(new Date());
      this.period.set(value);
    }
  }

  changeEventType(value: unknown): void {
    if (value === 'all' || this.availableTypes().includes(value as OfficeEventType)) {
      this.eventType.set(value as OfficeEventType | 'all');
    }
  }

  load(refresh = false): void {
    const generation = ++this.generation;
    this.today.set(new Date());
    if (!this.availableTypes().length) {
      this.events.set([]);
      this.warnings.set([]);
      this.sprint.set(null);
      this.sprintError.set('');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    forkJoin({
      sheets: this.api.load(refresh),
      sprint: this.dashboard.get({}, refresh).pipe(
        map(data => ({ value: data.currentSprint, error: '' })),
        catchError(() =>
          of({ value: null, error: 'Active Sprint could not be loaded. Refresh or choose a month view.' }),
        ),
      ),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(({ sheets, sprint }) => {
        if (generation !== this.generation) return;
        this.events.set(sheets.events);
        this.warnings.set(sheets.warnings);
        this.sprint.set(sprint.value);
        this.sprintError.set(sprint.error);
        this.loading.set(false);
      });
  }

  eventDate(event: OfficeEvent): string {
    if (!event.startDate || !event.endDate) return '';
    return event.startDate === event.endDate
      ? this.formatDate(event.startDate)
      : `${this.formatDate(event.startDate)} – ${this.formatDate(event.endDate)}`;
  }
  relativeDateLabel(event: OfficeEvent): string {
    if (!event.startDate || event.startDate !== event.endDate) return '';
    const [year, month, day] = event.startDate.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    const today = this.today();
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const difference = Math.round((target.getTime() - current.getTime()) / 86_400_000);
    if (difference === 0) return 'Today';
    if (difference === 1) return 'Tomorrow';
    if (difference === 2) return 'In 2 days';
    if (difference > 2 && difference <= 7) return `In ${difference} days`;
    if (difference === -1) return 'Yesterday';
    if (difference < -1 && difference >= -7) return `${Math.abs(difference)} days ago`;
    return '';
  }
  isPastEvent(event: OfficeEvent): boolean {
    if (!event.startDate || event.startDate !== event.endDate) return false;
    const [year, month, day] = event.startDate.split('-').map(Number);
    const target = new Date(year, month - 1, day);
    const today = this.today();
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return (
      target.getFullYear() === current.getFullYear() &&
      target.getMonth() === current.getMonth() &&
      target.getTime() < current.getTime()
    );
  }
  private formatDate(date: string): string {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
}
