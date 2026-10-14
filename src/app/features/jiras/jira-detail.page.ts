import { Component, DestroyRef, SecurityContext, effect, inject, input, signal } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { firstValueFrom, Subscription } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonIcon, IonPopover, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  arrowBackOutline,
  arrowForwardOutline,
  chevronForwardOutline,
  copyOutline,
  codeSlashOutline,
  documentTextOutline,
  textOutline,
  createOutline,
  refreshOutline,
} from 'ionicons/icons';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { ReportOutputService } from '../../core/platform/report-output.service';
import { jiraPdfFilename, jiraReport } from './jira-report';
import { apiError, apiErrorCode } from '../../core/api/api-error';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { JiraDetail, SpillEvent, SprintHistoryItem } from '../../shared/models/api.models';
import { formatDate, formatDateRange, names } from '../../shared/utils/format';
import { activeSprint, spilloverLabel } from '../../shared/utils/jira';
import { JiraLinkComponent } from './jira-link.component';
import { JiraEditComponent } from './jira-edit.component';
import { JiraSpillReasonEditorComponent } from './jira-spill-reason-editor.component';
import { JiraService } from './jiras.service';
import { MarkdownViewerComponent, renderMarkdown } from '../productivity/markdown-viewer.component';
import { markdownBlocks } from '../../core/platform/report-markdown';
import { InlineMarkdownPipe } from '../productivity/inline-markdown.pipe';
import { AlterControlsService } from '../../core/management/alter-controls.service';
import { ReleaseItemEditorComponent } from '../releases/release-item-editor.component';

@Component({
  selector: 'app-jira-detail',
  imports: [
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonPopover,
    IonTitle,
    IonToolbar,
    LoadingSkeletonComponent,
    StatePanelComponent,
    StatusBadgeComponent,
    JiraLinkComponent,
    JiraEditComponent,
    JiraSpillReasonEditorComponent,
    MarkdownViewerComponent,
    InlineMarkdownPipe,
    ReleaseItemEditorComponent,
  ],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar
        ><ion-title>JIRA detail</ion-title>
        <ion-button slot="end" fill="clear" aria-label="Refresh JIRA" (click)="load(true)"
          ><ion-icon slot="icon-only" name="refresh-outline" /></ion-button
        ><ion-button slot="end" fill="clear" aria-label="Edit JIRA" (click)="editOpen.set(true)"
          ><ion-icon slot="icon-only" name="create-outline"
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
            <div class="detail-action-row">
              <ion-button
                class="jira-pdf-export"
                fill="outline"
                [disabled]="exporting()"
                [attr.aria-busy]="exporting()"
                (click)="exportPdf()">
                {{ exporting() ? 'Exporting PDF…' : 'Export as PDF' }}
              </ion-button>
              @if (alterControls.alterSprintEnabled() || alterControls.alterReleaseManagementEnabled()) {
                <div class="detail-header-actions">
                  @if (alterControls.alterSprintEnabled()) {
                    <ion-button
                      fill="outline"
                      [disabled]="jiraInCurrentSprint(jira) || addingToSprint()"
                      [attr.title]="jiraInCurrentSprint(jira) ? 'This JIRA is already in the current Sprint.' : null"
                      (click)="addToCurrentSprint(jira)">
                      {{
                        jiraInCurrentSprint(jira)
                          ? 'In current Sprint'
                          : addingToSprint()
                            ? 'Adding…'
                            : 'Add to current Sprint'
                      }}
                    </ion-button>
                  }
                  @if (alterControls.alterReleaseManagementEnabled()) {
                    <ion-button fill="outline" (click)="releaseEditorOpen.set(true)">Add to release item</ion-button>
                  }
                </div>
              }
            </div>
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
              @if (jira.releaseItemCount > 0) {
                <app-status-badge [label]="'Releases ' + jira.releaseItemCount" />
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
                <div>
                  <dt>JIRA Key</dt>
                  <dd>{{ jira.jiraKey }}</dd>
                </div>
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
                @if (jira.firstSprintStart) {
                  <div>
                    <dt>First Sprint Start</dt>
                    <dd>{{ date(jira.firstSprintStart) }}</dd>
                  </div>
                }
                @if (currentSprint(jira); as sprint) {
                  <div>
                    <dt>Current Sprint</dt>
                    <dd>{{ sprint.name }}</dd>
                  </div>
                }
                <div>
                  <dt>Spillover</dt>
                  <dd>{{ jira.spilloverCount }} {{ jira.spilloverCount === 1 ? 'spill' : 'spills' }}</dd>
                </div>
                <div>
                  <dt>Appraisal</dt>
                  <dd>{{ jira.appraisal ? 'Yes' : 'No' }}</dd>
                </div>
                @if (jira.timeline.startedDate) {
                  <div>
                    <dt>Work started</dt>
                    <dd>{{ date(jira.timeline.startedDate) }}</dd>
                  </div>
                }
                @if (jira.timeline.endedDate) {
                  <div>
                    <dt>Sprint window through</dt>
                    <dd>{{ date(jira.timeline.endedDate) }}</dd>
                  </div>
                }
              </dl>
            </section>

            @if (jira.description.trim()) {
              <section class="detail-section description-section">
                <h2>Description</h2>
                <app-markdown-viewer [markdown]="jira.description" />
              </section>
            }

            @if (jira.sprintHistory.length > 0) {
              <section class="detail-section sprint-history-section">
                <div class="section-title-row">
                  <h2>Sprint history</h2>
                  @if (!jira.spillHistoryConsistent) {
                    <span class="allocation-warning">Spill history needs review</span>
                  }
                </div>
                <div class="sprint-timeline">
                  @for (history of jira.sprintHistory; track history.sprint.id) {
                    <article class="sprint-history-item" [class.current]="history.sprint.active">
                      <div class="sprint-history-heading">
                        <div>
                          <h3>{{ history.sprint.name }}</h3>
                          @if (history.sprint.active) {
                            <app-status-badge label="Current" kind="success" />
                          }
                          @if (history.spilled) {
                            <app-status-badge label="Spilled" />
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
                      @if (history.allocationNotes.trim()) {
                        <p class="allocation-notes">{{ history.allocationNotes }}</p>
                      }
                    </article>
                    @for (event of eventsFrom(jira, history.sprint.id); track event.number) {
                      <article class="spill-event">
                        <div class="spill-event-heading">
                          <h3>Spill #{{ event.number }}</h3>
                          <div class="spill-reason-actions">
                            <ion-button
                              class="spill-reason-action"
                              size="small"
                              fill="clear"
                              [disabled]="!!spillReasonUnavailable(jira, event)"
                              [attr.aria-describedby]="
                                spillReasonUnavailable(jira, event) ? 'spill-reason-hint-' + event.number : null
                              "
                              (click)="openSpillReasonEditor(event)">
                              <ion-icon slot="start" name="create-outline" aria-hidden="true" />
                              {{ event.reason?.trim() ? 'Edit reason' : 'Add reason' }}
                            </ion-button>
                            @if (event.reason?.trim()) {
                              <ion-button
                                class="spill-reason-copy"
                                size="small"
                                fill="clear"
                                [id]="'spill-reason-copy-' + event.number"
                                [attr.aria-label]="'Copy reason for spill #' + event.number"
                                aria-haspopup="dialog"
                                title="Copy reason"
                                [disabled]="copyingSpillReason() === event.number"
                                [attr.aria-busy]="copyingSpillReason() === event.number">
                                <ion-icon slot="icon-only" name="copy-outline" aria-hidden="true" />
                              </ion-button>
                              <ion-popover
                                #copyPopover
                                cssClass="spill-copy-popover"
                                [trigger]="'spill-reason-copy-' + event.number"
                                side="bottom"
                                alignment="end">
                                <ng-template>
                                  <div class="spill-copy-menu" aria-label="Copy reason format">
                                    <ion-button
                                      expand="block"
                                      fill="clear"
                                      (click)="copyPopover.dismiss(); copySpillReason(event, 'text')">
                                      <ion-icon slot="start" name="text-outline" aria-hidden="true" />Normal text
                                    </ion-button>
                                    <ion-button
                                      expand="block"
                                      fill="clear"
                                      (click)="copyPopover.dismiss(); copySpillReason(event, 'markdown')">
                                      <ion-icon slot="start" name="code-slash-outline" aria-hidden="true" />Markdown
                                    </ion-button>
                                    @if (richCopySupported) {
                                      <ion-button
                                        expand="block"
                                        fill="clear"
                                        (click)="copyPopover.dismiss(); copySpillReason(event, 'formatted')">
                                        <ion-icon
                                          slot="start"
                                          name="document-text-outline"
                                          aria-hidden="true" />Formatted text
                                      </ion-button>
                                    }
                                  </div>
                                </ng-template>
                              </ion-popover>
                            }
                          </div>
                        </div>
                        <p class="spill-route">
                          <a [routerLink]="['/app/sprints', event.fromSprint.id]">{{ event.fromSprint.name }}</a>
                          <ion-icon name="arrow-forward-outline" aria-label="to" />
                          <a [routerLink]="['/app/sprints', event.toSprint.id]">{{ event.toSprint.name }}</a>
                        </p>
                        @if (event.reason?.trim()) {
                          <div class="spill-reason">
                            <strong>Reason</strong>
                            <app-markdown-viewer class="compact-markdown" [markdown]="event.reason ?? ''" />
                          </div>
                        } @else {
                          <p>No spill reason recorded.</p>
                        }
                        @if (spillReasonUnavailable(jira, event); as hint) {
                          <p class="allocation-warning" [id]="'spill-reason-hint-' + event.number">{{ hint }}</p>
                        }
                      </article>
                    }
                  }
                </div>
              </section>
            }

            <section class="detail-section work-history-section">
              <div class="section-title-row">
                <h2>Work history</h2>
                <span>{{ jira.workLogCount }} {{ jira.workLogCount === 1 ? 'log' : 'logs' }}</span>
              </div>
              @if (jira.workLogs.length) {
                <div class="work-history-list">
                  @for (log of jira.workLogs; track log.id) {
                    <article class="work-history-item">
                      <div class="work-history-heading">
                        <div>
                          <strong class="inline-markdown" [innerHTML]="log.update | inlineMarkdown"></strong>
                          <span>{{ date(log.date) }}</span>
                        </div>
                        <span class="badge-line">
                          @if (log.type) {
                            <app-status-badge [label]="log.type" />
                          }
                          @if (log.workMode) {
                            <app-status-badge [label]="log.workMode" />
                          }
                          @if (log.appraisal) {
                            <app-status-badge label="Appraisal" kind="success" />
                          }
                        </span>
                      </div>
                      @if (log.comment || log.wentWrong) {
                        <details>
                          <summary>Details</summary>
                          @if (log.comment) {
                            <h4>Comment</h4>
                            <app-markdown-viewer class="compact-markdown" [markdown]="log.comment" />
                          }
                          @if (log.wentWrong) {
                            <h4>Went wrong</h4>
                            <app-markdown-viewer class="compact-markdown" [markdown]="log.wentWrong" />
                          }
                        </details>
                      }
                    </article>
                  }
                </div>
              } @else {
                <p>No Work Logs recorded for this JIRA.</p>
              }
            </section>

            @if (jira.relationships.length > 0) {
              <section class="detail-section relationships-section">
                <h2>Relationships</h2>
                <div class="relationship-grid">
                  @for (relationship of jira.relationships; track relationship.direction + relationship.otherJira.id) {
                    <article class="relationship-item">
                      <div class="relationship-heading">
                        <strong>{{ relationship.displayType }}</strong>
                        @if (relationship.resolvedOn) {
                          <app-status-badge label="Resolved" />
                        }
                      </div>
                      <div class="relationship-jira">
                        <app-jira-link [jiraKey]="relationship.otherJira.key" [showExternal]="true" />
                        @if (relationship.otherJira.summary) {
                          <span>{{ relationship.otherJira.summary }}</span>
                        }
                        @if (relationship.otherJira.status) {
                          <app-status-badge [label]="relationship.otherJira.status" kind="jira-status" />
                        }
                      </div>
                      @if (relationship.reason.trim()) {
                        <p class="relationship-reason">{{ relationship.reason }}</p>
                      }
                      @if (relationship.linkedOn || relationship.resolvedOn) {
                        <p class="relationship-dates">
                          @if (relationship.linkedOn) {
                            Linked {{ date(relationship.linkedOn) }}
                          }
                          @if (relationship.linkedOn && relationship.resolvedOn) {
                            <span aria-hidden="true"> · </span>
                          }
                          @if (relationship.resolvedOn) {
                            Resolved {{ date(relationship.resolvedOn) }}
                          }
                        </p>
                      }
                    </article>
                  }
                </div>
              </section>
            }

            <section class="detail-section release-history-section">
              <div class="section-title-row">
                <h2>Release history</h2>
                <span>{{ jira.releaseItemCount }} {{ jira.releaseItemCount === 1 ? 'release' : 'releases' }}</span>
              </div>
              @if (jira.releaseItems.length) {
                <div class="release-history-list">
                  @for (release of jira.releaseItems; track release.id) {
                    <article class="release-history-item">
                      <strong>{{ release.componentName || release.releaseItem }}</strong>
                      <dl>
                        <div>
                          <dt>Deployment</dt>
                          <dd>
                            @if (release.deploymentType) {
                              <app-status-badge [label]="release.deploymentType" />
                            } @else {
                              Not recorded
                            }
                          </dd>
                        </div>
                        @if (release.versionNumber) {
                          <div>
                            <dt>Version</dt>
                            <dd>{{ release.versionNumber }}</dd>
                          </div>
                        }
                        @if (release.branch) {
                          <div>
                            <dt>Branch</dt>
                            <dd>{{ release.branch }}</dd>
                          </div>
                        }
                        @if (release.formalAnnouncedDate) {
                          <div>
                            <dt>Formal announced</dt>
                            <dd>{{ date(release.formalAnnouncedDate) }}</dd>
                          </div>
                        }
                        @if (release.confirmedReleaseDate) {
                          <div>
                            <dt>Confirmed release</dt>
                            <dd>{{ date(release.confirmedReleaseDate) }}</dd>
                          </div>
                        }
                      </dl>
                      @if (release.notes) {
                        <details>
                          <summary>Notes</summary>
                          <app-markdown-viewer class="compact-markdown" [markdown]="release.notes" />
                        </details>
                      }
                    </article>
                  }
                </div>
              } @else {
                <p>No release information recorded for this JIRA.</p>
              }
            </section>

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
            <section class="detail-section record-information">
              <h2>Record information</h2>
              <dl class="detail-grid">
                <div>
                  <dt>Created</dt>
                  <dd>{{ date(jira.createdTime) }}</dd>
                </div>
                <div>
                  <dt>Last updated</dt>
                  <dd>{{ date(jira.lastEditedTime) }}</dd>
                </div>
              </dl>
            </section>
          </div>
          <app-jira-edit [open]="editOpen()" [item]="jira" (closed)="editOpen.set(false)" (saved)="edited($event)" />
          <app-release-item-editor
            [open]="releaseEditorOpen()"
            [jiraId]="jira.id"
            [jiraKey]="jira.jiraKey"
            (closed)="releaseEditorOpen.set(false)"
            (saved)="releaseSaved()" />
          @if (selectedSpillEvent(); as event) {
            <app-jira-spill-reason-editor
              [open]="true"
              [jiraKey]="jira.jiraKey"
              [event]="event"
              (closed)="selectedSpillEvent.set(null)"
              (saved)="spillReasonSaved($event)" />
          }
        }</main
    ></ion-content>`,
})
export class JiraDetailPage {
  readonly jiraKey = input.required<string>();
  readonly item = signal<JiraDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly editOpen = signal(false);
  readonly releaseEditorOpen = signal(false);
  readonly addingToSprint = signal(false);
  readonly selectedSpillEvent = signal<SpillEvent | null>(null);
  readonly copyingSpillReason = signal<number | null>(null);
  readonly richCopySupported =
    typeof ClipboardItem !== 'undefined' &&
    typeof navigator.clipboard?.write === 'function' &&
    (typeof ClipboardItem.supports !== 'function' || ClipboardItem.supports('text/html'));
  readonly exporting = signal(false);
  readonly names = names;
  readonly date = formatDate;
  readonly dateRange = formatDateRange;
  readonly spilled = spilloverLabel;
  private readonly service = inject(JiraService);
  private readonly snackbar = inject(SnackbarService);
  private readonly sanitizer = inject(DomSanitizer);
  private readonly reportOutput = inject(ReportOutputService);
  private readonly destroyRef = inject(DestroyRef);
  readonly alterControls = inject(AlterControlsService);
  private request?: Subscription;

  constructor() {
    addIcons({
      arrowBackOutline,
      arrowForwardOutline,
      chevronForwardOutline,
      copyOutline,
      codeSlashOutline,
      documentTextOutline,
      textOutline,
      createOutline,
      refreshOutline,
    });
    effect(() => {
      this.jiraKey();
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

  jiraInCurrentSprint(jira: JiraDetail): boolean {
    return jira.inActiveSprint || this.currentSprint(jira) !== null;
  }

  async addToCurrentSprint(jira: JiraDetail): Promise<void> {
    if (this.addingToSprint() || this.jiraInCurrentSprint(jira) || !this.alterControls.alterSprintEnabled()) return;
    this.addingToSprint.set(true);
    try {
      const response = await firstValueFrom(this.service.addToCurrentSprint(jira.jiraKey));
      this.item.set(response.data);
      this.snackbar.success(
        response.alreadyAssigned ? 'JIRA is already in the current Sprint.' : 'JIRA added to the current Sprint.',
      );
    } catch (error) {
      if (apiErrorCode(error) === 'ALTER_SPRINT_DISABLED') {
        await this.alterControls.refresh().catch(() => undefined);
        this.snackbar.error('Alter Sprint has expired. Enable it again in Settings.');
      } else if (apiErrorCode(error) === 'ACTIVE_SPRINT_NOT_FOUND') {
        this.snackbar.error('No active Sprint is configured.');
      } else if (apiErrorCode(error) === 'ACTIVE_SPRINT_CONFLICT') {
        this.snackbar.error('Multiple active Sprints are configured.');
      } else if (apiErrorCode(error) === 'SPRINT_ALLOCATION_CONFLICT') {
        this.snackbar.error('This JIRA has conflicting Sprint Allocation records.');
      } else if (apiErrorCode(error) === 'SPRINT_ASSIGNMENT_PARTIAL') {
        this.snackbar.error(
          'The Sprint relation was updated, but the allocation could not be completed. Refresh and try again.',
        );
        this.load(true);
      } else {
        this.snackbar.error(apiError(error));
      }
    } finally {
      this.addingToSprint.set(false);
    }
  }

  releaseSaved(): void {
    this.releaseEditorOpen.set(false);
    this.snackbar.success('Release Item created.');
    this.load(true);
  }

  async exportPdf(): Promise<void> {
    const jira = this.item();
    if (!jira || this.loading() || this.error() || this.exporting()) return;
    this.exporting.set(true);
    try {
      await this.reportOutput.pdf(jiraReport(jira), jiraPdfFilename(jira.jiraKey));
      this.snackbar.success(
        this.reportOutput.android ? 'Choose an app to save or share the PDF.' : 'JIRA PDF downloaded.',
      );
    } catch {
      this.snackbar.error('Unable to export JIRA PDF. Please try again.');
    } finally {
      this.exporting.set(false);
    }
  }

  eventsFrom(jira: JiraDetail, sprintId: string): SpillEvent[] {
    return jira.spillEvents.filter(event => event.fromSprint.id === sprintId);
  }

  spillReasonUnavailable(jira: JiraDetail, event: SpillEvent): string {
    const receiving = jira.sprintHistory.find(history => history.sprint.id === event.toSprint.id);
    if (receiving?.allocationConflict) return 'Resolve the Sprint Allocation conflict before editing this reason.';
    if (!receiving?.allocationId) return 'Add a Sprint Allocation for the receiving Sprint before editing this reason.';
    return '';
  }

  openSpillReasonEditor(event: SpillEvent): void {
    const jira = this.item();
    if (jira && !this.spillReasonUnavailable(jira, event)) this.selectedSpillEvent.set(event);
  }

  async copySpillReason(event: SpillEvent, format: 'text' | 'markdown' | 'formatted' = 'markdown'): Promise<void> {
    const reason = event.reason;
    if (!reason?.trim() || this.copyingSpillReason() !== null) return;
    this.copyingSpillReason.set(event.number);
    try {
      const text =
        format === 'markdown'
          ? reason
          : markdownBlocks(reason)
              .map(
                block =>
                  '  '.repeat(block.level && block.kind === 'bullet' ? block.level : 0) +
                  (block.cells?.join('\t') ?? block.text),
              )
              .join('\n\n');
      if (format === 'formatted') {
        const html = this.sanitizer.sanitize(SecurityContext.HTML, renderMarkdown(reason).html) ?? '';
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': new Blob([html], { type: 'text/html' }),
            'text/plain': new Blob([text], { type: 'text/plain' }),
          }),
        ]);
      } else if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else this.copyReasonWithSelection(text);
      this.snackbar.success('Spill reason copied.');
    } catch {
      this.snackbar.error('Unable to copy spill reason. Please try again.');
    } finally {
      this.copyingSpillReason.set(null);
    }
  }

  private copyReasonWithSelection(reason: string): void {
    const previousFocus = document.activeElement;
    const field = document.createElement('textarea');
    field.value = reason;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    try {
      field.select();
      if (!document.execCommand('copy')) throw new Error('Copy was not available.');
    } finally {
      field.remove();
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    }
  }

  spillReasonSaved(item: JiraDetail): void {
    const number = this.selectedSpillEvent()?.number;
    const reason = item.spillEvents.find(event => event.number === number)?.reason;
    this.item.set(item);
    this.selectedSpillEvent.set(null);
    this.snackbar.success(reason?.length ? 'Spill reason updated.' : 'Spill reason cleared.');
  }

  plannedDays(history: SprintHistoryItem): string {
    if (history.plannedDays === null) return 'Planned days not recorded';
    return `Planned: ${history.plannedDays} ${history.plannedDays === 1 ? 'day' : 'days'}`;
  }
  edited(item: JiraDetail): void {
    this.item.set(item);
    this.editOpen.set(false);
    this.snackbar.success('JIRA updated.');
  }
}
