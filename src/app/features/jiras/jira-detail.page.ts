import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, arrowForwardOutline, chevronForwardOutline, refreshOutline } from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { JiraDetail, SpillEvent, SprintHistoryItem } from '../../shared/models/api.models';
import { formatDate, formatDateRange, names } from '../../shared/utils/format';
import { activeSprint, spilloverLabel } from '../../shared/utils/jira';
import { JiraLinkComponent } from './jira-link.component';
import { JiraService } from './jiras.service';

@Component({
  selector: 'app-jira-detail',
  imports: [
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    LoadingSkeletonComponent,
    StatePanelComponent,
    StatusBadgeComponent,
    JiraLinkComponent,
  ],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar
        ><ion-title>JIRA detail</ion-title>
        <ion-button slot="end" fill="clear" aria-label="Refresh JIRA" (click)="load(true)"
          ><ion-icon slot="icon-only" name="refresh-outline"
        /></ion-button> </ion-toolbar
    ></ion-header>
    <ion-content
      ><main class="page-wrap detail-page">
        <ion-button class="back-link" fill="clear" routerLink="/app/jiras" queryParamsHandling="preserve"
          ><ion-icon slot="start" name="arrow-back-outline" />Back to JIRAs</ion-button
        >
        @if (loading()) {
          <app-loading-skeleton [rows]="5" />
        } @else if (error() || !item()) {
          <app-state-panel [error]="error()" message="JIRA not found." (retry)="load()" />
        } @else if (item(); as jira) {
          <header class="detail-header">
            <app-jira-link [jiraKey]="jira.jiraKey" [showExternal]="true" [externalText]="true" />
            @if (jira.summary) {
              <h1>{{ jira.summary }}</h1>
            }
            <div class="badge-line">
              @if (jira.status) {
                <app-status-badge [label]="jira.status" kind="jira-status" />
              }
              @if (currentSprint(jira); as sprint) {
                <app-status-badge [label]="sprint.name" />
              }
              @if (jira.spilloverCount > 0) {
                <app-status-badge [label]="spilled(jira.spilloverCount)" />
              }
              @if (jira.appraisal) {
                <app-status-badge label="Appraisal" kind="success" />
              }
            </div>
          </header>

          <div class="detail-columns">
            <section class="detail-section">
              <h2>Overview</h2>
              <dl class="detail-grid">
                @if (jira.status) {
                  <div>
                    <dt>Status</dt>
                    <dd>{{ jira.status }}</dd>
                  </div>
                }
                @if (names(jira.projects)) {
                  <div>
                    <dt>Project</dt>
                    <dd>{{ names(jira.projects) }}</dd>
                  </div>
                }
                @if (jira.tags.length) {
                  <div class="wide">
                    <dt>Tags</dt>
                    <dd class="badge-line">
                      @for (tag of jira.tags; track tag) {
                        <app-status-badge [label]="tag" />
                      }
                    </dd>
                  </div>
                }
              </dl>
            </section>

            @if (jira.sprintHistory.length > 0) {
              <section class="detail-section sprint-history-section">
                <h2>Sprint history</h2>
                <div class="sprint-timeline">
                  @for (history of jira.sprintHistory; track history.sprint.id) {
                    <article class="sprint-history-item" [class.current]="history.sprint.active">
                      <div class="sprint-history-heading">
                        <div>
                          <h3>{{ history.sprint.name }}</h3>
                          @if (history.sprint.active) {
                            <app-status-badge label="Current" kind="success" />
                          }
                        </div>
                        <a [routerLink]="['/app/sprints', history.sprint.id]">
                          View sprint
                          <ion-icon name="chevron-forward-outline" aria-hidden="true" />
                        </a>
                      </div>
                      @if (dateRange(history.sprint.startDate, history.sprint.endDate)) {
                        <p>{{ dateRange(history.sprint.startDate, history.sprint.endDate) }}</p>
                      }
                      @if (history.allocationConflict) {
                        <p class="allocation-warning">
                          <strong>Allocation conflict</strong> · {{ history.allocationCount }}
                          {{ history.allocationCount === 1 ? 'record' : 'records' }} found
                        </p>
                      } @else {
                        <p class="planned-days">{{ plannedDays(history) }}</p>
                      }
                    </article>
                    @for (event of eventsFrom(jira, history.sprint.id); track event.number) {
                      <article class="spill-event">
                        <h3>Spill #{{ event.number }}</h3>
                        <p class="spill-route">
                          <a [routerLink]="['/app/sprints', event.fromSprint.id]">{{ event.fromSprint.name }}</a>
                          <ion-icon name="arrow-forward-outline" aria-label="to" />
                          <a [routerLink]="['/app/sprints', event.toSprint.id]">{{ event.toSprint.name }}</a>
                        </p>
                        @if (event.reason?.trim()) {
                          <div class="spill-reason">
                            <strong>Reason</strong>
                            <p>{{ event.reason }}</p>
                          </div>
                        }
                      </article>
                    }
                  }
                </div>
              </section>
            }

            @if ((jira.blockedBy?.length ?? 0) > 0) {
              <section class="detail-section">
                <h2>Dependency</h2>
                <p><strong>Blocked by</strong></p>
                <div class="compact-list">
                  @for (blocker of jira.blockedBy ?? []; track blocker.id) {
                    <div class="text-row">
                      <app-jira-link [jiraKey]="blocker.key" [showExternal]="true" /><span>{{ blocker.summary }}</span>
                    </div>
                  }
                </div>
              </section>
            }

            @if (jira.demoRequired || jira.demoedDate || jira.demoNotes) {
              <section class="detail-section">
                <h2>Demo</h2>
                <p>
                  <strong>State</strong><br />{{
                    jira.demoedDate ? 'Demoed' : jira.demoRequired ? 'Required' : 'Not required'
                  }}
                </p>
                @if (jira.demoedDate) {
                  <p><strong>Demoed date</strong><br />{{ date(jira.demoedDate) }}</p>
                }
                @if (jira.demoNotes) {
                  <p><strong>Notes</strong><br />{{ jira.demoNotes }}</p>
                }
              </section>
            }
          </div>
        }
      </main></ion-content
    >`,
})
export class JiraDetailPage {
  readonly jiraKey = input.required<string>();
  readonly item = signal<JiraDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly names = names;
  readonly date = formatDate;
  readonly dateRange = formatDateRange;
  readonly spilled = spilloverLabel;
  private readonly service = inject(JiraService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  constructor() {
    addIcons({ arrowBackOutline, arrowForwardOutline, chevronForwardOutline, refreshOutline });
    effect(() => {
      this.jiraKey();
      this.load();
    });
  }

  load(refresh = false): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.service
      .detail(this.jiraKey(), refresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: item => {
          this.item.set(item);
          this.loading.set(false);
        },
        error: error => {
          this.error.set(apiError(error));
          this.loading.set(false);
        },
      });
  }

  currentSprint(jira: JiraDetail) {
    return activeSprint(jira.sprints);
  }

  eventsFrom(jira: JiraDetail, sprintId: string): SpillEvent[] {
    return jira.spillEvents.filter(event => event.fromSprint.id === sprintId);
  }

  plannedDays(history: SprintHistoryItem): string {
    if (history.plannedDays === null) return 'Planned days not recorded';
    return `Planned: ${history.plannedDays} ${history.plannedDays === 1 ? 'day' : 'days'}`;
  }
}
