import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronForwardOutline, refreshOutline } from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { DashboardResponse, Jira, Sprint } from '../../shared/models/api.models';
import { formatDate, formatRelativeTime, formatShortDate, truncate } from '../../shared/utils/format';
import { spilloverLabel } from '../../shared/utils/jira';
import { JiraLinkComponent } from '../jiras/jira-link.component';
import { DashboardService } from './dashboard.service';

interface AttentionItem {
  jira: Jira;
  blocked: boolean;
  spillover: boolean;
  demoPending: boolean;
}

@Component({
  selector: 'app-dashboard',
  imports: [
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    JiraLinkComponent,
    LoadingSkeletonComponent,
    StatePanelComponent,
    StatusBadgeComponent,
  ],
  template: `<ion-header class="ion-no-border">
      <ion-toolbar><ion-title>Dashboard</ion-title></ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="page-wrap dashboard-page">
        <header class="dashboard-header">
          <div>
            <p class="eyebrow">Office Orbit</p>
            <h1>Good to see you.</h1>
            <p>Here’s what deserves your attention today.</p>
          </div>
          <div class="refresh-area">
            @if (updated()) {
              <span>{{ updated() }}</span>
            }
            <ion-button fill="clear" (click)="load()" aria-label="Refresh dashboard">
              <ion-icon slot="icon-only" name="refresh-outline" />
            </ion-button>
          </div>
        </header>

        @if (loading()) {
          <div class="dashboard-skeleton"><app-loading-skeleton [rows]="6" /></div>
        } @else if (error() || !dashboard()) {
          <app-state-panel [error]="error()" (retry)="load()" />
        } @else if (dashboard(); as data) {
          @if (data.currentSprint; as sprint) {
            <section class="sprint-hero" aria-labelledby="current-sprint-heading">
              <div class="sprint-overview">
                <span class="section-label">Current sprint</span>
                <div class="sprint-name-line">
                  <h2 id="current-sprint-heading">{{ sprint.sprint }}</h2>
                  <app-status-badge label="Active" kind="success" />
                </div>
                @if (sprint.startDate || sprint.endDate) {
                  <p>
                    {{ shortDate(sprint.startDate) }}{{ sprint.startDate && sprint.endDate ? ' – ' : ''
                    }}{{ shortDate(sprint.endDate) }}
                  </p>
                }
                <p class="capacity-sentence">
                  <strong>{{ sprint.allocatedDays }}</strong> of {{ sprint.availableDays }} days allocated
                  <span>·</span> <strong>{{ sprint.remainingDays }}</strong> days remaining
                </p>
                <div
                  class="progress-track large"
                  role="progressbar"
                  [attr.aria-valuenow]="progress(sprint)"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label="Sprint capacity allocated">
                  <span [style.width.%]="progress(sprint)"></span>
                </div>
              </div>
              <dl class="hero-capacity">
                <div>
                  <dt>Capacity</dt>
                  <dd>{{ sprint.capacityDays }}</dd>
                </div>
                <div>
                  <dt>Available</dt>
                  <dd>{{ sprint.availableDays }}</dd>
                </div>
                <div>
                  <dt>Allocated</dt>
                  <dd>{{ sprint.allocatedDays }}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{{ sprint.remainingDays }}</dd>
                </div>
              </dl>
            </section>
          } @else {
            <section class="inline-empty">
              <strong>No active sprint</strong><span>Your next active sprint will appear here.</span>
            </section>
          }

          <section class="metric-grid" aria-label="JIRA summary">
            <a class="metric-card" routerLink="/app/jiras" [queryParams]="{ view: 'active' }"
              ><span>Active JIRAs</span><strong>{{ data.jiraSummary.active }}</strong
              ><small>View active work</small></a
            >
            <a class="metric-card danger-accent" routerLink="/app/jiras" [queryParams]="{ view: 'blocked' }"
              ><span>Blocked</span><strong>{{ data.jiraSummary.blocked }}</strong
              ><small>Review blockers</small></a
            >
            <a class="metric-card warning-accent" routerLink="/app/jiras" [queryParams]="{ view: 'spillovers' }"
              ><span>Spillovers</span><strong>{{ data.jiraSummary.spillovers }}</strong
              ><small>Review spillovers</small></a
            >
            <a class="metric-card" routerLink="/app/jiras" [queryParams]="{ view: 'demo-pending' }"
              ><span>Demo pending</span><strong>{{ data.jiraSummary.demoPending }}</strong
              ><small>Prepare demos</small></a
            >
          </section>

          <div class="dashboard-columns">
            <section class="section-panel attention-panel" aria-labelledby="attention-heading">
              <div class="section-title-row">
                <div>
                  <span class="section-label">Priorities</span>
                  <h2 id="attention-heading">Needs attention</h2>
                </div>
                <a routerLink="/app/jiras">View all</a>
              </div>
              @if (attention().length) {
                <div class="compact-list">
                  @for (entry of attention(); track entry.jira.id) {
                    <a class="compact-row" [routerLink]="['/app/jiras', entry.jira.jiraKey]">
                      <span class="entity-copy"
                        ><span class="entity-kicker">{{ entry.jira.jiraKey }}</span>
                        @if (entry.jira.summary) {
                          <strong>{{ entry.jira.summary }}</strong>
                        }
                        <span class="badge-line">
                          @if (entry.blocked) {
                            <app-status-badge label="Blocked" />
                          }
                          @if (entry.spillover) {
                            <app-status-badge [label]="spilled(entry.jira.spilloverCount)" />
                          }
                          @if (entry.demoPending) {
                            <app-status-badge label="Demo pending" />
                          }
                        </span> </span
                      ><ion-icon class="row-arrow" name="chevron-forward-outline" aria-hidden="true" />
                    </a>
                  }
                </div>
              } @else {
                <p class="compact-empty">Nothing needs immediate attention.</p>
              }
            </section>

            <section class="section-panel" aria-labelledby="recent-heading">
              <div class="section-title-row">
                <div>
                  <span class="section-label">Activity</span>
                  <h2 id="recent-heading">Recent work</h2>
                </div>
                <a routerLink="/app/work-logs">View all work logs</a>
              </div>
              @if (data.recentWorkLogs.length) {
                <div class="compact-list">
                  @for (log of data.recentWorkLogs.slice(0, 5); track log.id) {
                    <div class="recent-row">
                      <time [attr.datetime]="log.date">{{ date(log.date) }}</time>
                      <span class="entity-copy"
                        ><strong>{{ log.update || 'Work update' }}</strong
                        ><span class="meta-line">
                          @if (log.type) {
                            <span>{{ log.type }}</span>
                          }
                          @if (log.category) {
                            <span>{{ log.category }}</span>
                          }
                          @if (log.workMode) {
                            <span>{{ log.workMode }}</span>
                          }
                          @for (jira of log.jiras ?? []; track jira.id) {
                            <app-jira-link [jiraKey]="jira.key" />
                          }
                        </span>
                        @if (log.comment) {
                          <span class="preview">{{ short(log.comment) }}</span>
                        }
                      </span>
                    </div>
                  }
                </div>
              } @else {
                <p class="compact-empty">No recent work logged.</p>
              }
            </section>
          </div>

          <section class="summary-grid" aria-label="Release and feedback summary">
            <article class="summary-card">
              <div class="section-title-row">
                <h2>Releases</h2>
                <a routerLink="/app/releases">Open releases</a>
              </div>
              <div class="summary-values">
                <span
                  ><strong>{{ data.releaseSummary.pending }}</strong> pending confirmation</span
                ><span
                  ><strong>{{ data.releaseSummary.confirmed }}</strong> confirmed</span
                ><span
                  ><strong>{{ data.releaseSummary.notAnnounced }}</strong> not announced</span
                >
              </div>
            </article>
            <article class="summary-card">
              <div class="section-title-row">
                <h2>Feedback</h2>
                <a routerLink="/app/feedback">Open feedback</a>
              </div>
              <div class="summary-values">
                <span
                  ><strong>{{ data.feedbackSummary.appraisal }}</strong> appraisal items</span
                ><span
                  ><strong>{{ data.feedbackSummary.improvementFollowUp }}</strong> follow-ups</span
                ><span
                  ><strong>{{ data.feedbackSummary.negative }}</strong> negative</span
                >
              </div>
            </article>
          </section>
        }
      </main>
    </ion-content>`,
})
export class DashboardPage {
  private readonly api = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly dashboard = signal<DashboardResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly updated = computed(() => formatRelativeTime(this.dashboard()?.generatedAt));
  readonly attention = computed<AttentionItem[]>(() => {
    const data = this.dashboard();
    if (!data) return [];
    const entries = new Map<string, AttentionItem>();
    const add = (jira: Jira, type: 'blocked' | 'spillover' | 'demoPending') => {
      const key = jira.id || jira.jiraKey;
      const entry = entries.get(key) ?? { jira, blocked: false, spillover: false, demoPending: false };
      entry[type] = true;
      entries.set(key, entry);
    };
    data.blockedJiras.forEach(jira => add(jira, 'blocked'));
    data.spilloverJiras.forEach(jira => add(jira, 'spillover'));
    data.demoPendingJiras.forEach(jira => add(jira, 'demoPending'));
    return [...entries.values()].slice(0, 5);
  });
  readonly date = formatDate;
  readonly shortDate = formatShortDate;
  readonly short = truncate;
  readonly spilled = spilloverLabel;

  constructor() {
    addIcons({ chevronForwardOutline, refreshOutline });
    this.load(false);
  }

  progress(sprint: Sprint): number {
    return sprint.availableDays > 0
      ? Math.min(100, Math.max(0, Math.round((sprint.allocatedDays / sprint.availableDays) * 100)))
      : 0;
  }

  load(refresh = true): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .get({}, refresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: value => {
          this.dashboard.set(value);
          this.loading.set(false);
        },
        error: error => {
          this.error.set(apiError(error));
          this.loading.set(false);
        },
      });
  }
}
