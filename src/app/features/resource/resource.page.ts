import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import {
  IonButton,
  IonContent,
  IonCheckbox,
  IonHeader,
  IonIcon,
  IonModal,
  IonPopover,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  addOutline,
  chevronDownOutline,
  chevronForwardOutline,
  closeOutline,
  copyOutline,
  ellipsisVerticalOutline,
  openOutline,
  pencilOutline,
  refreshOutline,
} from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { NavigationStateService } from '../../core/cache/navigation-state.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { LinksService, safeUrl } from '../../core/platform/links.service';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import {
  DomainItem,
  Feedback,
  Jira,
  ReleaseItem,
  Sprint,
  SprintAllocation,
  SprintDetailJira,
  WorkLink,
  WorkLog,
} from '../../shared/models/api.models';
import {
  formatDate,
  formatRelativeTime,
  formatTodayLabel,
  jiraLabel,
  names,
  truncate,
} from '../../shared/utils/format';
import { activeSprint, spilloverLabel } from '../../shared/utils/jira';
import { JiraLinkComponent } from '../jiras/jira-link.component';
import { JiraCreateComponent } from '../jiras/jira-create.component';
import { FeedbackEditorComponent } from '../feedback/feedback-editor.component';
import { WorkLinkEditorComponent } from '../work-links/work-link-editor.component';
import { IonicDateFieldComponent } from '../../shared/components/ionic-date-field.component';

interface AllocationDetailSource {
  allocationJiras(allocations: SprintAllocation[], refresh?: boolean): Observable<Record<string, SprintDetailJira[]>>;
}

interface ReleaseCopyEntity {
  jiraKey: string | null;
  jiraSummary: string;
  releases: ReleaseItem[];
}

const JIRA_BROWSE_URL = 'https://clarivate.atlassian.net/browse/';

function supportsAllocationDetails(
  service: ReadFeatureService,
): service is ReadFeatureService & AllocationDetailSource {
  return 'allocationJiras' in service && typeof service.allocationJiras === 'function';
}

@Component({
  selector: 'app-resource',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    IonButton,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonIcon,
    IonModal,
    IonPopover,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    JiraLinkComponent,
    JiraCreateComponent,
    FeedbackEditorComponent,
    WorkLinkEditorComponent,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    StatePanelComponent,
    StatusBadgeComponent,
    IonicDateFieldComponent,
  ],
  template: `<ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>{{ feature.heading }}</ion-title>
        <ion-button slot="end" fill="clear" aria-label="Refresh this view" (click)="load(true)">
          <ion-icon slot="icon-only" name="refresh-outline" />
        </ion-button>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="page-wrap resource-page">
        <div class="page-action-row">
          <app-page-header [title]="feature.heading" [description]="feature.description" />
          @if (feature.kind === 'feedback') {
            <ion-button (click)="openFeedback(null)"
              ><ion-icon name="add-outline" slot="start" />Add feedback</ion-button
            >
          } @else if (feature.kind === 'work-links') {
            <ion-button (click)="openWorkLinkEditor(null)"
              ><ion-icon name="add-outline" slot="start" />Add work link</ion-button
            >
          } @else if (feature.kind === 'jiras') {
            <ion-button (click)="jiraCreateOpen.set(true)"
              ><ion-icon name="add-outline" slot="start" />Add JIRA</ion-button
            >
          }
        </div>
        @if (feature.kind === 'sprints') {
          <p class="today-label">Today: {{ today }}</p>
        }

        <ion-segment [value]="selected()" [scrollable]="true" (ionChange)="select($event.detail.value)">
          @for (view of feature.views; track view.path) {
            <ion-segment-button
              [value]="view.path"
              [attr.aria-label]="view.path === '/api/releases/pending' ? 'Pending confirmation' : view.label"
              >{{ view.label }}</ion-segment-button
            >
          }
        </ion-segment>

        <form class="filters compact-filters" [formGroup]="filters" (ngSubmit)="load()">
          <label>
            Search loaded items
            <input
              type="search"
              [value]="search()"
              (input)="searchChanged($event)"
              placeholder="Filter visible items" />
          </label>
          @if (feature.kind === 'work-logs') {
            <app-ionic-date-field label="From" controlId="resource-from" formControlName="from" />
            <app-ionic-date-field label="To" controlId="resource-to" formControlName="to" />
            <ion-button type="submit" fill="outline">Apply dates</ion-button>
          }
        </form>
        @if (feature.kind !== 'releases' && updatedAt(); as timestamp) {
          <p class="updated-label">{{ relative(timestamp) }}</p>
        }
        @if (notice()) {
          <p class="refresh-notice" role="status">{{ notice() }}</p>
        }

        @if (loading()) {
          <app-loading-skeleton [rows]="5" />
        } @else if (error() || !visible().length) {
          <app-state-panel [error]="error()" [message]="emptyMessage()" (retry)="load()" />
        } @else {
          @if (feature.kind === 'releases') {
            <div class="release-meta-row">
              @if (updatedAt(); as timestamp) {
                <span class="updated-label">{{ relative(timestamp) }}</span>
              }
              <span class="result-count"
                >{{ visible().length }} {{ resultNoun() }}{{ hasMore() ? ' loaded' : '' }}</span
              >
            </div>
          } @else {
            <p class="result-count">{{ visible().length }} {{ resultNoun() }}{{ hasMore() ? ' loaded' : '' }}</p>
          }

          @if (feature.kind === 'work-logs') {
            <section class="activity-list" aria-label="Work log history">
              @for (item of workLogs(); track item.id; let index = $index) {
                @if (showDateHeader(index)) {
                  <h2 class="date-group">{{ item.date ? date(item.date) : 'Date not set' }}</h2>
                }
                <button class="activity-row" type="button" (click)="openWorkLog(item)">
                  <span class="activity-main">
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
                    </span>
                    @if (item.comment) {
                      <span class="preview">{{ short(item.comment) }}</span>
                    }
                  </span>
                  <span class="row-badges">
                    @for (jira of item.jiras ?? []; track jira.id) {
                      <app-jira-link [jiraKey]="jira.key" />
                    }
                    @if (item.appraisal) {
                      <app-status-badge label="Appraisal" kind="success" />
                    }
                  </span>
                </button>
              }
            </section>
          } @else if (feature.kind === 'jiras') {
            <section class="entity-list" aria-label="JIRA items">
              @for (item of jiras(); track item.id) {
                <a
                  class="entity-row jira-row"
                  [routerLink]="['/app/jiras', item.jiraKey]"
                  queryParamsHandling="preserve">
                  <span class="entity-copy">
                    <span class="entity-kicker">{{ item.jiraKey }}</span>
                    @if (item.summary) {
                      <strong>{{ item.summary }}</strong>
                    }
                    <span class="badge-line">
                      @if (item.status) {
                        <app-status-badge [label]="item.status" kind="jira-status" />
                      }
                      @if (currentSprint(item); as sprint) {
                        <app-status-badge [label]="sprint.name" />
                      }
                      @if (item.spilloverCount > 0) {
                        <app-status-badge [label]="spilled(item.spilloverCount)" />
                      }
                      @if (item.demoRequired && !item.demoedDate) {
                        <app-status-badge label="Demo pending" />
                      }
                      @if (item.demoedDate) {
                        <app-status-badge label="Demoed" kind="success" />
                      }
                    </span>
                  </span>
                  <ion-icon class="row-arrow" name="chevron-forward-outline" aria-hidden="true" />
                </a>
              }
            </section>
          } @else if (feature.kind === 'sprints') {
            <section class="sprint-list">
              @for (item of sprintItems(); track item.id) {
                @if (isSprint(item)) {
                  <a class="sprint-card" [class.current]="item.active" [routerLink]="['/app/sprints', item.id]">
                    <div class="sprint-title-row">
                      <div>
                        <span class="entity-kicker">{{ names(item.projects) || 'Sprint' }}</span>
                        <h2>{{ item.sprint }}</h2>
                      </div>
                      @if (item.active) {
                        <app-status-badge label="Active" kind="success" />
                      }
                    </div>
                    @if (item.startDate || item.endDate) {
                      <p>
                        {{ date(item.startDate) }}{{ item.startDate && item.endDate ? ' – ' : ''
                        }}{{ date(item.endDate) }}
                      </p>
                    }
                    <div class="capacity-stats">
                      <span
                        ><strong>{{ item.capacityDays }}</strong
                        >Capacity</span
                      >
                      <span
                        ><strong>{{ item.availableDays }}</strong
                        >Available</span
                      >
                      <span
                        ><strong>{{ item.allocatedDays }}</strong
                        >Allocated</span
                      >
                      <span
                        ><strong>{{ item.remainingDays }}</strong
                        >Remaining</span
                      >
                    </div>
                    <div
                      class="progress-track"
                      role="progressbar"
                      [attr.aria-valuenow]="progress(item)"
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label="Sprint capacity allocated">
                      <span [style.width.%]="progress(item)"></span>
                    </div>
                  </a>
                } @else {
                  <article class="entity-row allocation-row">
                    <span class="entity-copy">
                      @if (allocationJiras(item).length > 0) {
                        @for (jira of allocationJiras(item); track jira.id) {
                          <a class="allocation-jira-link" [routerLink]="['/app/jiras', jira.jiraKey]">
                            <span>
                              <span class="entity-kicker">{{ jira.jiraKey }}</span>
                              @if (jira.summary) {
                                <strong>{{ short(jira.summary) }}</strong>
                              }
                              <span class="badge-line">
                                @if (jira.status) {
                                  <app-status-badge [label]="jira.status" kind="jira-status" />
                                }
                                @if (jira.spilloverCount > 0) {
                                  <app-status-badge [label]="spilled(jira.spilloverCount)" />
                                }
                              </span>
                            </span>
                          </a>
                        }
                      } @else {
                        <strong>{{ item.allocation || 'Sprint allocation' }}</strong>
                      }
                      @if (item.notes) {
                        <span class="preview">{{ short(item.notes) }}</span>
                      }
                      @if (item.spilled) {
                        <span class="badge-line allocation-badges">
                          <app-status-badge label="Spilled" />
                        </span>
                      }
                      @if (item.spillReason.trim()) {
                        <span class="preview allocation-spill-reason">Spill reason: {{ short(item.spillReason) }}</span>
                      }
                    </span>
                    <span class="planned-days"
                      ><strong>{{ item.plannedDays }}</strong> planned days</span
                    >
                    @if (allocationJiras(item).length > 0) {
                      <ion-icon class="row-arrow allocation-arrow" name="chevron-forward-outline" aria-hidden="true" />
                    }
                  </article>
                }
              }
            </section>
          } @else if (feature.kind === 'releases') {
            <section class="release-list" aria-label="Releases">
              <div class="release-selection-toolbar" aria-live="polite">
                <span>{{
                  selectedReleaseIds().length ? selectedReleaseIds().length + ' selected' : 'Select releases'
                }}</span>
                <span>
                  <ion-button fill="clear" size="small" (click)="selectVisibleReleases()">Select visible</ion-button>
                  @if (selectedReleaseIds().length) {
                    <ion-button fill="clear" size="small" (click)="clearReleaseSelection()">Clear</ion-button>
                    <ion-button size="small" (click)="openReleaseCopyOptions()"
                      ><ion-icon name="copy-outline" slot="start" />Copy release notes</ion-button
                    >
                  }
                </span>
              </div>
              <div class="release-table-wrap">
                <table class="release-table">
                  <thead>
                    <tr>
                      <th scope="col" class="release-select-column" aria-label="Select releases"></th>
                      <th scope="col">Release</th>
                      <th scope="col">Delivery</th>
                      <th scope="col">JIRAs</th>
                      <th scope="col">Status</th>
                      <th scope="col">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of releases(); track item.id) {
                      <tr [class.release-selected]="isReleaseSelected(item)">
                        <td class="release-select-column">
                          <input
                            type="checkbox"
                            [checked]="isReleaseSelected(item)"
                            [attr.aria-label]="'Select release ' + releaseTitle(item)"
                            (change)="releaseSelectionChanged(item, $event)" />
                        </td>
                        <td class="release-name-cell">
                          <strong>{{ releaseTitle(item) }}</strong>
                          @if (item.branch) {
                            <span>{{ item.branch }}</span>
                          }
                        </td>
                        <td>
                          @if (item.deploymentType || item.versionNumber) {
                            <span class="release-delivery">
                              @if (item.deploymentType) {
                                <span>{{ item.deploymentType }}</span>
                              }
                              @if (item.versionNumber) {
                                <span>{{ item.versionNumber }}</span>
                              }
                            </span>
                          } @else {
                            <span class="muted-value">Not set</span>
                          }
                        </td>
                        <td>
                          @if (item.jiras?.length) {
                            <span class="jira-reference-list">
                              @for (jira of item.jiras; track jira.id) {
                                <app-jira-link [jiraKey]="jira.key" [showExternal]="true" />
                              }
                            </span>
                          } @else {
                            <span class="muted-value">Not linked</span>
                          }
                        </td>
                        <td><app-status-badge [label]="releaseState(item)" /></td>
                        <td class="release-date-cell">
                          {{ date(item.confirmedReleaseDate || item.formalAnnouncedDate) }}
                        </td>
                      </tr>
                      @if (item.notes || item.sprints?.length) {
                        <tr class="release-details-row">
                          <td colspan="6">
                            <details>
                              <summary>
                                Release details <ion-icon name="chevron-down-outline" aria-hidden="true" />
                              </summary>
                              <div class="release-details-content">
                                @if (item.sprints?.length) {
                                  <p><strong>Sprint</strong><br />{{ names(item.sprints) }}</p>
                                }
                                @if (item.notes) {
                                  <p class="release-notes">{{ item.notes }}</p>
                                }
                              </div>
                            </details>
                          </td>
                        </tr>
                      }
                    }
                  </tbody>
                </table>
              </div>
            </section>
            <ion-modal class="release-copy-modal" [isOpen]="releaseCopyOpen()" (didDismiss)="closeReleaseCopyOptions()">
              <ng-template>
                <ion-header class="ion-no-border">
                  <ion-toolbar>
                    <ion-title>Copy release notes</ion-title>
                    <ion-button
                      slot="end"
                      fill="clear"
                      aria-label="Close copy options"
                      (click)="closeReleaseCopyOptions()">
                      <ion-icon slot="icon-only" name="close-outline" />
                    </ion-button>
                  </ion-toolbar>
                </ion-header>
                <ion-content>
                  <div class="release-copy-options">
                    <p>
                      {{ selectedReleaseIds().length }} selected release{{
                        selectedReleaseIds().length === 1 ? '' : 's'
                      }}
                    </p>
                    <ion-checkbox
                      justify="start"
                      labelPlacement="end"
                      [checked]="groupReleaseCopyByJira()"
                      (ionChange)="groupReleaseCopyByJira.set($event.detail.checked)">
                      Show the same JIRA as one release group
                    </ion-checkbox>
                    <ion-checkbox
                      justify="start"
                      labelPlacement="end"
                      [checked]="combineReleaseCopyComponents()"
                      (ionChange)="combineReleaseCopyComponents.set($event.detail.checked)">
                      Combine matching components in the same JIRA group
                    </ion-checkbox>
                    <ion-checkbox
                      justify="start"
                      labelPlacement="end"
                      [checked]="groupReleaseCopyAcrossJiras()"
                      [disabled]="!groupReleaseCopyByJira()"
                      (ionChange)="groupReleaseCopyAcrossJiras.set($event.detail.checked)">
                      Group identical artifacts across different JIRAs
                    </ion-checkbox>
                    <ion-checkbox
                      justify="start"
                      labelPlacement="end"
                      [checked]="useMasterForEmptyReleaseBranch()"
                      (ionChange)="useMasterForEmptyReleaseBranch.set($event.detail.checked)">
                      Use master when a branch is empty
                    </ion-checkbox>
                    <ion-checkbox
                      justify="start"
                      labelPlacement="end"
                      [checked]="includeReleaseArtifactVersions()"
                      (ionChange)="includeReleaseArtifactVersions.set($event.detail.checked)">
                      Include artifact versions and release details
                    </ion-checkbox>
                    <ion-checkbox
                      justify="start"
                      labelPlacement="end"
                      [checked]="prefixNumericReleaseVersions()"
                      [disabled]="!includeReleaseArtifactVersions()"
                      (ionChange)="prefixNumericReleaseVersions.set($event.detail.checked)">
                      Prefix numeric artifact versions with #
                    </ion-checkbox>
                  </div>
                  <div class="release-copy-preview">
                    <span>Preview</span>
                    <pre>{{ releaseNotesText(selectedReleases()) }}</pre>
                  </div>
                  <div class="release-copy-actions">
                    <ion-button fill="clear" (click)="closeReleaseCopyOptions()">Cancel</ion-button>
                    <ion-button (click)="copySelectedReleaseNotes()"
                      ><ion-icon name="copy-outline" slot="start" />Copy</ion-button
                    >
                  </div>
                </ion-content>
              </ng-template>
            </ion-modal>
          } @else if (feature.kind === 'feedback') {
            <section class="entity-list" aria-label="Feedback">
              @for (item of feedbackItems(); track item.id) {
                <article class="entity-row feedback-row">
                  <div class="entity-copy">
                    <div class="feedback-header">
                      <span class="entity-kicker">{{ date(item.date) }}</span>
                      <div class="feedback-actions">
                        @if (item.feedbackType) {
                          <app-status-badge [label]="item.feedbackType" />
                        }
                        <ion-button
                          fill="clear"
                          size="small"
                          [attr.aria-label]="'Edit feedback ' + (item.feedback || '')"
                          (click)="openFeedback(item)">
                          <ion-icon name="pencil-outline" slot="start" />Edit
                        </ion-button>
                      </div>
                    </div>
                    <strong>{{ item.feedback || 'Feedback' }}</strong>
                    <span class="meta-line">
                      @if (item.feedbackFrom) {
                        <span>From {{ item.feedbackFrom }}</span>
                      }
                      @if (item.personType) {
                        <span>{{ item.personType }}</span>
                      }
                      @if (item.context) {
                        <span>{{ item.context }}</span>
                      }
                      @if (item.workType) {
                        <span>{{ item.workType }}</span>
                      }
                      @if (names(item.teams)) {
                        <span>{{ names(item.teams) }}</span>
                      }
                      @if (names(item.companies)) {
                        <span>{{ names(item.companies) }}</span>
                      }
                    </span>
                    @if (item.details) {
                      <span class="preview">{{ item.details }}</span>
                    }
                    @if (item.actionFollowUp) {
                      <span class="follow-up"><strong>Follow-up:</strong> {{ item.actionFollowUp }}</span>
                    }
                  </div>
                </article>
              }
            </section>
          } @else {
            <div class="work-link-table-wrap">
              <table class="work-link-table" aria-label="Work links">
                <thead>
                  <tr>
                    <th scope="col">Resource</th>
                    <th scope="col">Type</th>
                    <th scope="col">Scope</th>
                    <th scope="col">Status</th>
                    <th scope="col" class="actions-heading">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @for (item of workLinks(); track item.id; let rowIndex = $index) {
                    <tr>
                      <td class="work-link-resource">
                        <strong>{{ item.link || 'Work link' }}</strong>
                        @if (item.notes) {
                          <span>{{ item.notes }}</span>
                        }
                      </td>
                      <td class="work-link-type">
                        <span class="mobile-cell-label" aria-hidden="true">Type</span>
                        {{ item.type || 'Not set' }}
                      </td>
                      <td class="work-link-scope">
                        <span class="mobile-cell-label" aria-hidden="true">Scope</span>
                        @if (names(item.projects) || names(item.companies)) {
                          <span class="scope-values">
                            @if (names(item.projects)) {
                              <span>{{ names(item.projects) }}</span>
                            }
                            @if (names(item.companies)) {
                              <span>{{ names(item.companies) }}</span>
                            }
                          </span>
                        } @else {
                          <span class="muted-value">Not set</span>
                        }
                      </td>
                      <td class="work-link-status">
                        <span class="mobile-cell-label" aria-hidden="true">Status</span>
                        <app-status-badge
                          [label]="item.active ? 'Active' : 'Inactive'"
                          [kind]="item.active ? 'success' : 'neutral'" />
                      </td>
                      <td class="work-link-actions">
                        <ion-button
                          fill="clear"
                          size="small"
                          [attr.aria-label]="'Edit work link ' + item.link"
                          (click)="openWorkLinkEditor(item)">
                          <ion-icon name="pencil-outline" slot="start" />Edit
                        </ion-button>
                        @if (safeLink(item)) {
                          <ion-button
                            [id]="'work-link-actions-' + rowIndex"
                            fill="clear"
                            size="small"
                            [attr.aria-label]="'More actions for ' + item.link"
                            aria-haspopup="menu">
                            <ion-icon name="ellipsis-vertical-outline" slot="start" />More
                          </ion-button>
                          <ion-popover
                            #actionsPopover
                            cssClass="work-link-popover"
                            [trigger]="'work-link-actions-' + rowIndex"
                            triggerAction="click"
                            side="bottom"
                            alignment="end">
                            <ng-template>
                              <div class="work-link-menu" role="menu" [attr.aria-label]="'Actions for ' + item.link">
                                <ion-button
                                  role="menuitem"
                                  expand="block"
                                  fill="clear"
                                  (click)="actionsPopover.dismiss(); openLink(item)">
                                  <ion-icon name="open-outline" slot="start" />Open
                                </ion-button>
                                <ion-button
                                  role="menuitem"
                                  expand="block"
                                  fill="clear"
                                  (click)="actionsPopover.dismiss(); copyLink(item)">
                                  <ion-icon name="copy-outline" slot="start" />Copy link
                                </ion-button>
                              </div>
                            </ng-template>
                          </ion-popover>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        }

        @if (hasMore()) {
          <ion-button fill="outline" [disabled]="loadingMore()" (click)="load(false, true)">{{
            loadingMore() ? 'Loading...' : 'Load more'
          }}</ion-button>
        }
      </main>

      @if (selectedWorkLog(); as item) {
        <div class="detail-backdrop" (click)="closeWorkLog()" aria-hidden="true"></div>
        <aside class="detail-sheet" role="dialog" aria-modal="true" aria-labelledby="work-log-title">
          <button
            class="icon-button close-button"
            type="button"
            aria-label="Close work log details"
            (click)="closeWorkLog()">
            <ion-icon name="close-outline" />
          </button>
          <p class="eyebrow">Work log · {{ date(item.date) }}</p>
          <h2 id="work-log-title">{{ item.update || 'Work update' }}</h2>
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
                <p><strong>Sprints:</strong> {{ names(item.sprints) }}</p>
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
      <app-feedback-editor
        [open]="feedbackEditorOpen()"
        [item]="editingFeedback()"
        (closed)="closeFeedbackEditor()"
        (saved)="feedbackSaved($event)" />
      <app-work-link-editor
        [open]="workLinkEditorOpen()"
        [item]="editingWorkLink()"
        (closed)="closeWorkLinkEditor()"
        (saved)="workLinkSaved($event)" />
      @if (feature.kind === 'jiras') {
        <app-jira-create [open]="jiraCreateOpen()" (closed)="jiraCreateOpen.set(false)" (saved)="jiraSaved($event)" />
      }
    </ion-content>`,
})
export class ResourcePage {
  readonly feature = inject(ReadFeatureService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly links = inject(LinksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigationState = inject(NavigationStateService);
  private readonly snackbar = inject(SnackbarService);
  private request?: Subscription;
  private allocationRequest?: Subscription;
  readonly selected = signal(this.feature.views[0].path);
  readonly items = signal<DomainItem[]>([]);
  readonly count = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly notice = signal('');
  readonly search = signal('');
  readonly hasMore = signal(false);
  readonly loadingMore = signal(false);
  readonly updatedAt = signal<number | null>(null);
  readonly selectedWorkLog = signal<WorkLog | null>(null);
  readonly feedbackEditorOpen = signal(false);
  readonly editingFeedback = signal<Feedback | null>(null);
  readonly workLinkEditorOpen = signal(false);
  readonly jiraCreateOpen = signal(false);
  readonly editingWorkLink = signal<WorkLink | null>(null);
  readonly allocationDetails = signal<Record<string, SprintDetailJira[]>>({});
  readonly selectedReleaseIds = signal<string[]>([]);
  readonly releaseCopyOpen = signal(false);
  readonly groupReleaseCopyByJira = signal(true);
  readonly combineReleaseCopyComponents = signal(true);
  readonly groupReleaseCopyAcrossJiras = signal(true);
  readonly useMasterForEmptyReleaseBranch = signal(false);
  readonly includeReleaseArtifactVersions = signal(true);
  readonly prefixNumericReleaseVersions = signal(true);
  readonly filters = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });
  readonly visible = computed(() => {
    const term = this.search().toLowerCase().trim();
    return term ? this.items().filter(item => this.searchText(item).includes(term)) : this.items();
  });
  readonly resultNoun = computed(() =>
    this.feature.kind === 'releases'
      ? this.visible().length === 1
        ? 'release'
        : 'releases'
      : this.visible().length === 1
        ? 'item'
        : 'items',
  );
  readonly workLogs = computed(() => this.visible() as WorkLog[]);
  readonly jiras = computed(() => this.visible() as Jira[]);
  readonly sprintItems = computed(() => this.visible() as Array<Sprint | SprintAllocation>);
  readonly releases = computed(() => this.visible() as ReleaseItem[]);
  readonly selectedReleases = computed(() => {
    const selectedIds = new Set(this.selectedReleaseIds());
    return this.releases().filter(item => selectedIds.has(item.id));
  });
  readonly feedbackItems = computed(() => this.visible() as Feedback[]);
  readonly workLinks = computed(() => this.visible() as WorkLink[]);
  readonly date = formatDate;
  readonly names = names;
  readonly short = truncate;
  readonly relative = (timestamp: number) => formatRelativeTime(new Date(timestamp).toISOString());
  readonly today = formatTodayLabel();

  constructor() {
    addIcons({
      addOutline,
      chevronDownOutline,
      chevronForwardOutline,
      closeOutline,
      copyOutline,
      ellipsisVerticalOutline,
      openOutline,
      pencilOutline,
      refreshOutline,
    });
    const requestedView = this.route.snapshot.queryParamMap.get('view');
    const matchingView = this.feature.views.find(view => requestedView && this.viewToken(view.label) === requestedView);
    const restored = this.navigationState.read(this.feature.kind);
    if (matchingView) this.selected.set(matchingView.path);
    else if (restored && this.feature.views.some(view => view.path === restored.selected))
      this.selected.set(restored.selected);
    if (restored) this.search.set(restored.search);
    this.load();
  }

  searchChanged(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.search.set(event.target.value);
      if (this.feature.kind === 'releases') this.clearReleaseSelection();
      this.saveNavigationState();
    }
  }

  select(value: string | number | undefined): void {
    if (typeof value === 'string' && value !== this.selected()) {
      this.selected.set(value);
      this.search.set('');
      this.saveNavigationState();
      if (this.feature.kind === 'jiras')
        void this.router.navigate([], {
          relativeTo: this.route,
          queryParams: { view: this.viewToken(this.feature.views.find(view => view.path === value)?.label ?? '') },
          queryParamsHandling: 'merge',
          replaceUrl: true,
        });
      this.load();
    }
  }

  load(refresh = false, more = false, preserveVisible = false): void {
    if (more && this.loadingMore()) return;
    const filters: Record<string, string> = this.feature.kind === 'work-logs' ? this.filters.getRawValue() : {};
    if (filters['from'] && filters['to'] && filters['from'] > filters['to']) {
      this.error.set('The start date must be before the end date.');
      this.loading.set(false);
      this.loadingMore.set(false);
      return;
    }
    this.request?.unsubscribe();
    this.allocationRequest?.unsubscribe();
    this.allocationDetails.set({});
    this.loading.set(!more && !preserveVisible);
    this.loadingMore.set(more);
    this.error.set('');
    this.notice.set('');
    if (!more && !preserveVisible) {
      this.hasMore.set(false);
      this.items.set([]);
      if (this.feature.kind === 'releases') this.selectedReleaseIds.set([]);
    }
    this.request = this.feature
      .list(this.selected(), filters, refresh, more)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.items.set(response.data);
          this.count.set(response.count);
          this.hasMore.set(response.hasMore);
          this.updatedAt.set(response.lastUpdated ?? this.feature.updatedAt(this.selected(), filters));
          this.loading.set(false);
          this.loadingMore.set(false);
          const allocations = response.data.filter(
            (item): item is SprintAllocation => this.feature.kind === 'sprints' && 'allocation' in item,
          );
          if (allocations.length > 0 && supportsAllocationDetails(this.feature)) {
            this.allocationRequest = this.feature
              .allocationJiras(allocations, refresh)
              .pipe(takeUntilDestroyed(this.destroyRef))
              .subscribe({
                next: details => this.allocationDetails.set(details),
                error: () => this.allocationDetails.set({}),
              });
          }
        },
        error: error => {
          if (preserveVisible) this.notice.set('Saved, but the latest list could not be refreshed. Try Refresh.');
          else this.error.set(apiError(error));
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }

  emptyMessage(): string {
    if (this.search()) return 'No items on this loaded page match your search.';
    if (this.feature.kind === 'work-logs') return 'No work logged for this period.';
    if (this.feature.kind === 'jiras' && this.selected().includes('blocked')) return 'No blocked JIRAs.';
    if (this.feature.kind === 'releases' && this.selected().includes('pending'))
      return 'No releases waiting for confirmation.';
    return `No ${this.feature.heading.toLowerCase()} found in this view.`;
  }

  showDateHeader(index: number): boolean {
    const logs = this.workLogs();
    return index === 0 || logs[index - 1]?.date !== logs[index]?.date;
  }

  openWorkLog(item: WorkLog): void {
    this.selectedWorkLog.set(item);
  }

  closeWorkLog(): void {
    this.selectedWorkLog.set(null);
  }

  openFeedback(item: Feedback | null): void {
    this.editingFeedback.set(item);
    this.feedbackEditorOpen.set(true);
  }

  closeFeedbackEditor(): void {
    this.feedbackEditorOpen.set(false);
    this.editingFeedback.set(null);
  }

  feedbackSaved(item: Feedback): void {
    const editing = this.editingFeedback() !== null;
    this.upsert(item);
    this.closeFeedbackEditor();
    this.snackbar.success(editing ? 'Feedback updated.' : 'Feedback added.');
    this.load(true, false, true);
  }

  openWorkLinkEditor(item: WorkLink | null): void {
    this.editingWorkLink.set(item);
    this.workLinkEditorOpen.set(true);
  }

  closeWorkLinkEditor(): void {
    this.workLinkEditorOpen.set(false);
    this.editingWorkLink.set(null);
  }

  workLinkSaved(item: WorkLink): void {
    const editing = this.editingWorkLink() !== null;
    this.upsert(item);
    this.closeWorkLinkEditor();
    this.snackbar.success(editing ? 'Work link updated.' : 'Work link added.');
    this.load(true, false, true);
  }

  jiraSaved(item: Jira): void {
    this.upsert(item);
    this.jiraCreateOpen.set(false);
    this.snackbar.success('JIRA added.');
    this.load(true, false, true);
  }

  private upsert(item: DomainItem): void {
    this.items.update(items =>
      items.some(current => current.id === item.id)
        ? items.map(current => (current.id === item.id ? item : current))
        : [item, ...items],
    );
  }

  isSprint(item: Sprint | SprintAllocation): item is Sprint {
    return 'sprint' in item;
  }

  allocationJiras(item: SprintAllocation): SprintDetailJira[] {
    return this.allocationDetails()[item.id] ?? [];
  }

  progress(item: Sprint): number {
    return item.availableDays > 0
      ? Math.min(100, Math.max(0, Math.round((item.allocatedDays / item.availableDays) * 100)))
      : 0;
  }

  currentSprint(item: Jira) {
    return activeSprint(item.sprints);
  }

  readonly spilled = spilloverLabel;

  jira(item: WorkLog | ReleaseItem): string {
    return jiraLabel(item.jiras);
  }

  releaseState(item: ReleaseItem): string {
    if (item.confirmedReleaseDate) return 'Confirmed';
    if (item.formalAnnouncedDate) return 'Pending confirmation';
    return 'Not announced';
  }

  releaseTitle(item: ReleaseItem): string {
    return item.componentName || item.releaseItem || 'Release';
  }

  isReleaseSelected(item: ReleaseItem): boolean {
    return this.selectedReleaseIds().includes(item.id);
  }

  releaseSelectionChanged(item: ReleaseItem, event: Event): void {
    if (event.target instanceof HTMLInputElement) this.toggleReleaseSelection(item.id, event.target.checked);
  }

  selectVisibleReleases(): void {
    this.selectedReleaseIds.set(this.releases().map(item => item.id));
  }

  clearReleaseSelection(): void {
    this.selectedReleaseIds.set([]);
  }

  openReleaseCopyOptions(): void {
    if (this.selectedReleases().length) this.releaseCopyOpen.set(true);
  }

  closeReleaseCopyOptions(): void {
    this.releaseCopyOpen.set(false);
  }

  async copySelectedReleaseNotes(): Promise<void> {
    const notes = this.releaseNotesText(this.selectedReleases());
    if (!notes) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(notes);
      else this.copyWithSelection(notes);
      this.snackbar.success('Release notes copied.');
      this.clearReleaseSelection();
      this.closeReleaseCopyOptions();
    } catch {
      this.snackbar.error('The release notes could not be copied.');
    }
  }

  releaseNotesText(releases: ReleaseItem[]): string {
    const entities = this.releaseCopyEntities(releases);
    if (!this.includeReleaseArtifactVersions())
      return entities
        .map(entity => entity.releases[0].componentName || entity.releases[0].releaseItem)
        .filter(Boolean)
        .join('\n');

    const showNumbers = new Set(entities.map(entity => this.releaseCopyArtifactSignature(entity))).size > 1;
    if (!this.groupReleaseCopyByJira()) {
      return entities
        .map((entity, index) => this.releaseCopyEntry(entity, showNumbers ? index + 1 : null, true))
        .join('\n\n___\n\n');
    }

    const blocks = this.groupReleaseCopyAcrossJiras()
      ? this.releaseCopyArtifactBlocks(entities, showNumbers)
      : this.releaseCopyJiraBlocks(entities, showNumbers);
    return blocks.join('\n\n___\n\n');
  }

  private releaseCopyEntities(releases: ReleaseItem[]): ReleaseCopyEntity[] {
    const entities: ReleaseCopyEntity[] = [];
    for (const release of releases) {
      const jira = release.jiras?.[0];
      const jiraKey = jira?.key ?? null;
      const jiraSummary = jira?.summary || release.releaseItem || this.releaseTitle(release);
      const componentKey = (release.componentName || release.releaseItem || release.id).trim().toLocaleLowerCase();
      const existing = this.combineReleaseCopyComponents()
        ? entities.find(
            entity =>
              entity.jiraKey === jiraKey &&
              (entity.releases[0].componentName || entity.releases[0].releaseItem || entity.releases[0].id)
                .trim()
                .toLocaleLowerCase() === componentKey &&
              entity.releases[0].deploymentType === release.deploymentType,
          )
        : undefined;
      if (existing) existing.releases.push(release);
      else entities.push({ jiraKey, jiraSummary, releases: [release] });
    }
    return entities;
  }

  private releaseCopyGroups(
    entities: ReleaseCopyEntity[],
  ): { jiraKey: string | null; jiraSummary: string; entities: ReleaseCopyEntity[] }[] {
    const groups: { jiraKey: string | null; jiraSummary: string; entities: ReleaseCopyEntity[] }[] = [];
    for (const entity of entities) {
      const existing = groups.find(group => group.jiraKey === entity.jiraKey);
      if (existing) existing.entities.push(entity);
      else groups.push({ jiraKey: entity.jiraKey, jiraSummary: entity.jiraSummary, entities: [entity] });
    }
    return groups;
  }

  private releaseCopyJiraBlocks(entities: ReleaseCopyEntity[], showNumbers: boolean): string[] {
    let position = 1;
    return this.releaseCopyGroups(entities).map(group => {
      const block = this.releaseCopyJiraBlock(group.entities, showNumbers ? position : null);
      position += group.entities.length;
      return block;
    });
  }

  private releaseCopyArtifactBlocks(entities: ReleaseCopyEntity[], showNumbers: boolean): string[] {
    const signatures = new Map<string, ReleaseCopyEntity[]>();
    for (const entity of entities) {
      const signature = this.releaseCopyArtifactSignature(entity);
      signatures.set(signature, [...(signatures.get(signature) ?? []), entity]);
    }
    const crossJiraSignatures = new Set(
      [...signatures].flatMap(([signature, matches]) =>
        new Set(matches.map(entity => entity.jiraKey).filter((key): key is string => Boolean(key))).size > 1
          ? [signature]
          : [],
      ),
    );
    const emitted = new Set<ReleaseCopyEntity>();
    const blocks: string[] = [];
    let position = 1;

    for (const entity of entities) {
      if (emitted.has(entity)) continue;
      const signature = this.releaseCopyArtifactSignature(entity);
      if (crossJiraSignatures.has(signature)) {
        const matches = signatures.get(signature) ?? [];
        matches.forEach(match => emitted.add(match));
        blocks.push(this.releaseCopyAcrossJiraBlock(matches, showNumbers ? position : null));
        position += 1;
        continue;
      }
      const jiraEntities = entities.filter(
        candidate =>
          candidate.jiraKey === entity.jiraKey &&
          !crossJiraSignatures.has(this.releaseCopyArtifactSignature(candidate)) &&
          !emitted.has(candidate),
      );
      jiraEntities.forEach(candidate => emitted.add(candidate));
      blocks.push(this.releaseCopyJiraBlock(jiraEntities, showNumbers ? position : null));
      position += jiraEntities.length;
    }
    return blocks;
  }

  private releaseCopyJiraBlock(entities: ReleaseCopyEntity[], position: number | null): string {
    const heading = this.releaseCopyHeading(entities[0]);
    const entries = entities.map((entity, index) =>
      this.releaseCopyEntry(entity, position === null ? null : position + index, false),
    );
    return `${heading.join('\n')}\n\n${entries.join('\n\n')}`;
  }

  private releaseCopyAcrossJiraBlock(entities: ReleaseCopyEntity[], position: number | null): string {
    const headings = entities
      .filter((entity, index) => entities.findIndex(match => match.jiraKey === entity.jiraKey) === index)
      .map(entity => this.releaseCopyHeading(entity).join('\n'));
    const combined: ReleaseCopyEntity = {
      ...entities[0],
      releases: entities.flatMap(entity => entity.releases),
    };
    return `${headings.join('\n\n')}\n\n${this.releaseCopyEntry(combined, position, false)}`;
  }

  private releaseCopyArtifactSignature(entity: ReleaseCopyEntity): string {
    const release = entity.releases[0];
    return [
      release.componentName || release.releaseItem,
      release.deploymentType,
      this.releaseCopyVersions(entity.releases).join('\u0001'),
    ]
      .map(value => (value ?? '').trim().toLocaleLowerCase())
      .join('\u0000');
  }

  private releaseCopyHeading(group: { jiraKey: string | null; jiraSummary: string }): string[] {
    const lines = [`Title: ${group.jiraSummary}`];
    if (group.jiraKey) lines.push(`JIRA: ${JIRA_BROWSE_URL}${group.jiraKey}`);
    return lines;
  }

  private releaseCopyEntry(entity: ReleaseCopyEntity, position: number | null, includeHeading: boolean): string {
    const release = entity.releases[0];
    const lines = position === null ? [] : [`${position}.`];
    if (includeHeading) lines.push(...this.releaseCopyHeading(entity), '');
    lines.push(`Component Name: ${release.componentName || release.releaseItem || 'Not set'}`);
    if (release.deploymentType) lines.push(`Deployment Type: ${release.deploymentType}`);
    const versions = this.releaseCopyVersions(entity.releases);
    if (versions.length) lines.push(`Version Number: ${versions.join('; ')}`);
    const comments = [...new Set(entity.releases.map(item => item.notes.trim()).filter(Boolean))];
    if (comments.length) lines.push(`Comment: ${comments.join('\n')}`);
    return lines.join('\n');
  }

  private releaseCopyVersions(releases: ReleaseItem[]): string[] {
    return [
      ...new Set(
        releases
          .map(release => {
            if (!release.versionNumber) return '';
            const branch = release.branch.trim() || (this.useMasterForEmptyReleaseBranch() ? 'master' : '');
            const numericVersion = /^\d+$/.test(release.versionNumber);
            const version =
              numericVersion && this.prefixNumericReleaseVersions()
                ? `#${release.versionNumber}`
                : release.versionNumber;
            return branch ? `${numericVersion ? version : `[${version}]`} from branch '${branch}'` : version;
          })
          .filter(Boolean),
      ),
    ];
  }

  private toggleReleaseSelection(id: string, selected: boolean): void {
    this.selectedReleaseIds.update(ids =>
      selected ? (ids.includes(id) ? ids : [...ids, id]) : ids.filter(currentId => currentId !== id),
    );
  }

  safeLink(item: WorkLink): string | null {
    return safeUrl(item.url);
  }

  async openLink(item: WorkLink): Promise<void> {
    const url = this.safeLink(item);
    if (url) await this.links.open(url);
  }

  async copyLink(item: WorkLink): Promise<void> {
    const url = this.safeLink(item);
    if (!url) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(url);
      else this.copyWithSelection(url);
      this.snackbar.success('Link copied.');
    } catch {
      this.snackbar.error('The link could not be copied.');
    }
  }

  private copyWithSelection(value: string): void {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Copy was not available.');
  }

  private searchText(item: DomainItem): string {
    if ('update' in item)
      return [item.update, item.category, item.type, item.workMode, jiraLabel(item.jiras)].join(' ').toLowerCase();
    if ('jiraKey' in item)
      return [item.jiraKey, item.summary, item.status, item.tags.join(' '), names(item.sprints)]
        .join(' ')
        .toLowerCase();
    if ('sprint' in item) return [item.sprint, names(item.projects)].join(' ').toLowerCase();
    if ('allocation' in item)
      return [
        item.allocation,
        item.notes,
        ...this.allocationJiras(item).flatMap(jira => [jira.jiraKey, jira.summary, jira.status, ...jira.tags]),
      ]
        .join(' ')
        .toLowerCase();
    if ('releaseItem' in item)
      return [item.releaseItem, item.componentName, item.deploymentType, item.versionNumber, jiraLabel(item.jiras)]
        .join(' ')
        .toLowerCase();
    if ('feedback' in item)
      return [
        item.feedback,
        item.feedbackFrom,
        item.context,
        item.feedbackType,
        item.workType,
        item.details,
        names(item.teams),
        names(item.companies),
      ]
        .join(' ')
        .toLowerCase();
    if ('link' in item)
      return [item.link, item.type, item.notes, names(item.projects), names(item.companies)].join(' ').toLowerCase();
    return '';
  }

  private saveNavigationState(): void {
    this.navigationState.save(this.feature.kind, { selected: this.selected(), search: this.search() });
  }

  private viewToken(label: string): string {
    return label.toLowerCase().replace(/\s+/g, '-');
  }
}
