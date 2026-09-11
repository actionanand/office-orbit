import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronForwardOutline, refreshOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SprintDetailJira, SprintDetailResponse } from '../../shared/models/api.models';
import { formatDateRange, formatTodayLabel, names } from '../../shared/utils/format';
import { spilloverLabel } from '../../shared/utils/jira';
import { SprintService } from './sprints.service';

@Component({
  selector: 'app-sprint-detail',
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
  ],
  template: `<ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Sprint detail</ion-title>
        <ion-button slot="end" fill="clear" aria-label="Refresh Sprint" (click)="load(true)">
          <ion-icon slot="icon-only" name="refresh-outline" aria-hidden="true" />
        </ion-button>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="page-wrap detail-page sprint-detail-page">
        <ion-button class="back-link" fill="clear" routerLink="/app/sprints">
          <ion-icon slot="start" name="arrow-back-outline" aria-hidden="true" />Back to Sprints
        </ion-button>
        @if (loading()) {
          <app-loading-skeleton [rows]="6" />
        } @else if (error() || !detail()) {
          <app-state-panel [error]="error()" message="Sprint not found." (retry)="load()" />
        } @else if (detail(); as data) {
          <header class="detail-header">
            <div class="sprint-title-row">
              <div>
                <span class="entity-kicker">Sprint</span>
                <h1>{{ data.sprint.sprint }}</h1>
              </div>
              @if (data.sprint.active) {
                <app-status-badge label="Active" kind="success" />
              }
            </div>
            @if (dateRange(data.sprint.startDate, data.sprint.endDate)) {
              <p>{{ dateRange(data.sprint.startDate, data.sprint.endDate) }}</p>
            }
            @if (data.sprint.active) {
              <p class="today-label">Today: {{ today }}</p>
            }
          </header>

          <div class="detail-columns">
            <section class="detail-section">
              <h2>Overview</h2>
              <dl class="detail-grid">
                @if (names(data.sprint.projects)) {
                  <div class="wide">
                    <dt>Project</dt>
                    <dd>{{ names(data.sprint.projects) }}</dd>
                  </div>
                }
                @if (weekOffs(data.sprint.weekOff1, data.sprint.weekOff2)) {
                  <div class="wide">
                    <dt>Week offs</dt>
                    <dd>{{ weekOffs(data.sprint.weekOff1, data.sprint.weekOff2) }}</dd>
                  </div>
                }
              </dl>
            </section>
            <section class="detail-section">
              <h2>Capacity</h2>
              <dl class="sprint-detail-capacity">
                <div>
                  <dt>Capacity</dt>
                  <dd>{{ data.sprint.capacityDays }}</dd>
                </div>
                <div>
                  <dt>Available</dt>
                  <dd>{{ data.sprint.availableDays }}</dd>
                </div>
                <div>
                  <dt>Allocated</dt>
                  <dd>{{ data.sprint.allocatedDays }}</dd>
                </div>
                <div>
                  <dt>Remaining</dt>
                  <dd>{{ data.sprint.remainingDays }}</dd>
                </div>
              </dl>
            </section>
          </div>

          <section class="detail-section sprint-jiras" aria-labelledby="sprint-jiras-heading">
            <div class="section-title-row">
              <h2 id="sprint-jiras-heading">JIRAs</h2>
              <span>{{ data.count }} {{ data.count === 1 ? 'JIRA' : 'JIRAs' }}</span>
            </div>
            @if (data.jiras.length) {
              <div class="entity-list">
                @for (jira of data.jiras; track jira.id) {
                  <a class="entity-row sprint-jira-row" [routerLink]="['/app/jiras', jira.jiraKey]">
                    <span class="entity-copy">
                      <span class="entity-kicker">{{ jira.jiraKey }}</span>
                      <strong>{{ jira.summary || 'JIRA' }}</strong>
                      <span class="badge-line">
                        @if (jira.status) {
                          <app-status-badge [label]="jira.status" kind="jira-status" />
                        }
                        @if (jira.spilloverCount > 0) {
                          <app-status-badge [label]="spilled(jira.spilloverCount)" />
                        }
                      </span>
                      @if (jira.allocationConflict) {
                        <span class="allocation-warning">
                          <strong>Allocation conflict</strong> · {{ jira.allocationCount }}
                          {{ jira.allocationCount === 1 ? 'record' : 'records' }}
                        </span>
                      } @else {
                        <span class="planned-days">{{ plannedDays(jira) }}</span>
                      }
                    </span>
                    <ion-icon class="row-arrow" name="chevron-forward-outline" aria-hidden="true" />
                  </a>
                }
              </div>
            } @else {
              <p>No JIRAs are assigned to this Sprint.</p>
            }
          </section>
        }
      </main>
    </ion-content>`,
})
export class SprintDetailPage {
  readonly sprintId = input.required<string>();
  readonly detail = signal<SprintDetailResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly dateRange = formatDateRange;
  readonly names = names;
  readonly today = formatTodayLabel();
  readonly spilled = spilloverLabel;
  private readonly service = inject(SprintService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  constructor() {
    addIcons({ arrowBackOutline, chevronForwardOutline, refreshOutline });
    effect(() => {
      this.sprintId();
      this.load();
    });
  }

  load(refresh = false): void {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.service
      .detail(this.sprintId(), refresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: detail => {
          this.detail.set(detail);
          this.loading.set(false);
        },
        error: error => {
          this.error.set(
            error instanceof HttpErrorResponse && error.status === 404 ? 'Sprint not found.' : apiError(error),
          );
          this.loading.set(false);
        },
      });
  }

  weekOffs(first: string | null, second: string | null): string {
    return [first, second].filter((value): value is string => Boolean(value)).join(', ');
  }

  plannedDays(jira: SprintDetailJira): string {
    if (jira.plannedDays === null) return 'Planned days not recorded';
    return `Planned: ${jira.plannedDays} ${jira.plannedDays === 1 ? 'day' : 'days'}`;
  }
}
