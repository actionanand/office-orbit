import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, chevronForwardOutline, pencilOutline, refreshOutline } from 'ionicons/icons';
import { Subscription } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { SprintDetailJira, SprintDetailResponse } from '../../shared/models/api.models';
import { formatDateRange, formatTodayLabel, names } from '../../shared/utils/format';
import { spilloverLabel } from '../../shared/utils/jira';
import { SprintService } from './sprints.service';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { SprintEditorComponent } from './sprint-editor.component';
import { SprintPlannedDaysEditorComponent } from './sprint-planned-days-editor.component';

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
    SprintEditorComponent,
    SprintPlannedDaysEditorComponent,
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
            @if (data.sprint.active && alterControls.alterSprintEnabled()) {
              <ion-button fill="outline" (click)="sprintEditorOpen.set(true)">
                <ion-icon name="pencil-outline" slot="start" />Edit Sprint
              </ion-button>
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
              <dl class="sprint-detail-capacity capacity-values">
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
              <div
                class="progress-track capacity-progress"
                role="progressbar"
                aria-label="Sprint capacity allocated"
                aria-valuemin="0"
                aria-valuemax="100"
                [attr.aria-valuenow]="capacityProgress(data)">
                <span [style.width.%]="capacityProgress(data)"></span>
              </div>
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
                  <article class="entity-row sprint-jira-row sprint-jira-row-with-actions">
                    <a class="sprint-jira-link" [routerLink]="['/app/jiras', jira.jiraKey]">
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
                    @if (canEditPlannedDays(data, jira)) {
                      <ion-button fill="outline" size="small" (click)="editingJira.set(jira)">
                        <ion-icon name="pencil-outline" slot="start" />Edit Planned Days
                      </ion-button>
                    }
                  </article>
                }
              </div>
            } @else {
              <p>No JIRAs are assigned to this Sprint.</p>
            }
          </section>
          <app-sprint-editor
            [open]="sprintEditorOpen()"
            [item]="data.sprint"
            (closed)="sprintEditorOpen.set(false)"
            (saved)="sprintSaved()" />
          <app-sprint-planned-days-editor
            [open]="editingJira() !== null"
            [jira]="editingJira()"
            (closed)="editingJira.set(null)"
            (saved)="plannedDaysSaved($event)" />
        }
      </main>
    </ion-content>`,
})
export class SprintDetailPage {
  readonly sprintId = input.required<string>();
  readonly detail = signal<SprintDetailResponse | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly sprintEditorOpen = signal(false);
  readonly editingJira = signal<SprintDetailJira | null>(null);
  readonly dateRange = formatDateRange;
  readonly names = names;
  readonly today = formatTodayLabel();
  readonly spilled = spilloverLabel;
  private readonly service = inject(SprintService);
  private readonly destroyRef = inject(DestroyRef);
  readonly alterControls = inject(AlterControlsService);
  private readonly snackbar = inject(SnackbarService);
  private request?: Subscription;

  constructor() {
    addIcons({ arrowBackOutline, chevronForwardOutline, pencilOutline, refreshOutline });
    effect(() => {
      this.sprintId();
      this.load();
    });
    void this.alterControls.refresh().catch(() => undefined);
  }

  load(refresh = false): void {
    if (refresh) void this.alterControls.refresh().catch(() => undefined);
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

  capacityProgress(data: SprintDetailResponse): number {
    return data.sprint.availableDays > 0
      ? Math.min(100, Math.max(0, Math.round((data.sprint.allocatedDays / data.sprint.availableDays) * 100)))
      : 0;
  }

  canEditPlannedDays(data: SprintDetailResponse, jira: SprintDetailJira): boolean {
    return (
      data.sprint.active &&
      this.alterControls.alterSprintEnabled() &&
      jira.allocationId !== null &&
      !jira.allocationConflict
    );
  }

  plannedDaysSaved(detail: SprintDetailResponse): void {
    this.detail.set(detail);
    this.editingJira.set(null);
    this.snackbar.success('Planned Days updated.');
  }

  sprintSaved(): void {
    this.sprintEditorOpen.set(false);
    this.snackbar.success('Sprint updated.');
    this.load(true);
  }
}
