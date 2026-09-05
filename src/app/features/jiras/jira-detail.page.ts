import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, refreshOutline } from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { Jira } from '../../shared/models/api.models';
import { formatDate, names } from '../../shared/utils/format';
import { spilloverLabel } from '../../shared/utils/jira';
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
                <app-status-badge [label]="jira.status" />
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

            @if ((jira.sprints?.length ?? 0) > 0 || jira.spillover || jira.spilloverReason) {
              <section class="detail-section">
                <h2>Sprint</h2>
                @if (jira.sprints?.length) {
                  <p><strong>Current sprint</strong><br />{{ currentSprint(jira)?.name }}</p>
                  @if (jira.sprints.length > 1) {
                    <p><strong>Sprint history</strong><br />{{ sprintHistory(jira) }}</p>
                  }
                }
                @if (jira.spilloverCount > 0) {
                  <p><strong>Spillover count</strong><br />{{ jira.spilloverCount }}</p>
                }
                @if (jira.spilloverReason) {
                  <p><strong>Reason</strong><br />{{ jira.spilloverReason }}</p>
                }
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
  readonly item = signal<Jira | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly names = names;
  readonly date = formatDate;
  readonly spilled = spilloverLabel;
  private readonly service = inject(JiraService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;

  constructor() {
    addIcons({ arrowBackOutline, refreshOutline });
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

  currentSprint(jira: Jira) {
    return jira.sprints?.at(-1) ?? null;
  }

  sprintHistory(jira: Jira): string {
    return (
      jira.sprints
        ?.slice(0, -1)
        .map(sprint => sprint.name)
        .join(', ') ?? ''
    );
  }
}
