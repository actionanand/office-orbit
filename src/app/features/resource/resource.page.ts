import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { chevronDownOutline, chevronForwardOutline, closeOutline, openOutline, refreshOutline } from 'ionicons/icons';
import { apiError } from '../../core/api/api-error';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { NavigationStateService } from '../../core/cache/navigation-state.service';
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
  WorkLink,
  WorkLog,
} from '../../shared/models/api.models';
import { formatDate, formatRelativeTime, jiraLabel, names, truncate } from '../../shared/utils/format';
import { spilloverLabel } from '../../shared/utils/jira';
import { JiraLinkComponent } from '../jiras/jira-link.component';

@Component({
  selector: 'app-resource',
  imports: [
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
        <ion-title>{{ feature.heading }}</ion-title>
        <ion-button slot="end" fill="clear" aria-label="Refresh this view" (click)="load(true)">
          <ion-icon slot="icon-only" name="refresh-outline" />
        </ion-button>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="page-wrap resource-page">
        <app-page-header [title]="feature.heading" [description]="feature.description" />

        <ion-segment [value]="selected()" [scrollable]="true" (ionChange)="select($event.detail.value)">
          @for (view of feature.views; track view.path) {
            <ion-segment-button [value]="view.path">{{ view.label }}</ion-segment-button>
          }
        </ion-segment>

        <form class="filters compact-filters" [formGroup]="filters" (ngSubmit)="load()">
          <label>
            Search this loaded page
            <input
              type="search"
              [value]="search()"
              (input)="searchChanged($event)"
              placeholder="Filter visible items" />
          </label>
          @if (feature.kind === 'work-logs') {
            <label>From<input type="date" formControlName="from" /></label>
            <label>To<input type="date" formControlName="to" /></label>
            <ion-button type="submit" fill="outline">Apply dates</ion-button>
          }
        </form>
        @if (updatedAt(); as timestamp) {
          <p class="updated-label">{{ relative(timestamp) }}</p>
        }

        @if (loading()) {
          <app-loading-skeleton [rows]="5" />
        } @else if (error() || !visible().length) {
          <app-state-panel [error]="error()" [message]="emptyMessage()" (retry)="load()" />
        } @else {
          <p class="result-count">{{ visible().length }} of {{ count() }} items on this page</p>

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
                        <app-status-badge [label]="item.status" />
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
                  <article class="sprint-card" [class.current]="item.active">
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
                  </article>
                } @else {
                  <article class="entity-row allocation-row">
                    <span class="entity-copy"
                      ><strong>{{ item.allocation || 'Sprint allocation' }}</strong>
                      @if (item.notes) {
                        <span class="preview">{{ short(item.notes) }}</span>
                      }
                    </span>
                    <span class="planned-days"
                      ><strong>{{ item.plannedDays }}</strong> planned days</span
                    >
                  </article>
                }
              }
            </section>
          } @else if (feature.kind === 'releases') {
            <section class="table-list" aria-label="Releases">
              <div class="table-heading" aria-hidden="true">
                <span>JIRA / component</span><span>Type</span><span>Version</span><span>State / date</span>
              </div>
              @for (item of releases(); track item.id) {
                <details class="release-row">
                  <summary class="table-row">
                    <span>
                      @if (item.jiras?.length) {
                        <span class="jira-reference-list">
                          @for (jira of item.jiras; track jira.id) {
                            <app-jira-link [jiraKey]="jira.key" [showExternal]="true" />
                          }
                        </span>
                      } @else {
                        <strong>{{ item.releaseItem || 'Release item' }}</strong>
                      }
                      <small>{{ item.componentName }}</small>
                    </span>
                    <span>{{ item.deploymentType || '' }}</span>
                    <span>{{ item.versionNumber || '' }}</span>
                    <span
                      ><app-status-badge [label]="releaseState(item)" /><small>{{
                        date(item.confirmedReleaseDate || item.formalAnnouncedDate)
                      }}</small></span
                    >
                    <ion-icon class="disclosure-icon" name="chevron-down-outline" aria-hidden="true" />
                  </summary>
                  @if (item.branch || item.notes || (item.sprints?.length ?? 0) > 0) {
                    <div class="release-more">
                      @if (item.branch) {
                        <p><strong>Branch</strong><br />{{ item.branch }}</p>
                      }
                      @if (item.sprints?.length) {
                        <p><strong>Sprint</strong><br />{{ names(item.sprints) }}</p>
                      }
                      @if (item.notes) {
                        <p><strong>Notes</strong><br />{{ item.notes }}</p>
                      }
                    </div>
                  }
                </details>
              }
            </section>
          } @else if (feature.kind === 'feedback') {
            <section class="entity-list" aria-label="Feedback">
              @for (item of feedbackItems(); track item.id) {
                <article class="entity-row feedback-row">
                  <span class="entity-copy">
                    <span class="entity-kicker">{{ date(item.date) }}</span>
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
                      @if (names(item.projects)) {
                        <span>{{ names(item.projects) }}</span>
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
                  </span>
                  @if (item.feedbackType) {
                    <app-status-badge [label]="item.feedbackType" />
                  }
                </article>
              }
            </section>
          } @else {
            <section class="link-grid" aria-label="Work links">
              @for (item of workLinks(); track item.id) {
                <article class="shortcut-card">
                  <div class="shortcut-icon" aria-hidden="true">{{ linkInitial(item) }}</div>
                  <div>
                    <span class="entity-kicker">{{ item.type || 'Resource' }}</span>
                    <h2>{{ item.link || 'Work link' }}</h2>
                    @if (item.notes) {
                      <p>{{ item.notes }}</p>
                    }
                    @if (names(item.projects)) {
                      <p class="meta-line">{{ names(item.projects) }}</p>
                    }
                  </div>
                  @if (safeLink(item)) {
                    <ion-button fill="clear" (click)="openLink(item)"
                      >Open link <ion-icon name="open-outline" slot="end" aria-hidden="true"
                    /></ion-button>
                  }
                </article>
              }
            </section>
          }
        }

        @if (hasMore()) {
          <p class="message" role="status">
            More records exist. This view shows the first page returned by the service.
          </p>
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
    </ion-content>`,
})
export class ResourcePage {
  readonly feature = inject(ReadFeatureService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly links = inject(LinksService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navigationState = inject(NavigationStateService);
  private request?: Subscription;
  readonly selected = signal(this.feature.views[0].path);
  readonly items = signal<DomainItem[]>([]);
  readonly count = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly hasMore = signal(false);
  readonly updatedAt = signal<number | null>(null);
  readonly selectedWorkLog = signal<WorkLog | null>(null);
  readonly filters = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });
  readonly visible = computed(() => {
    const term = this.search().toLowerCase().trim();
    return term ? this.items().filter(item => this.searchText(item).includes(term)) : this.items();
  });
  readonly workLogs = computed(() => this.visible() as WorkLog[]);
  readonly jiras = computed(() => this.visible() as Jira[]);
  readonly sprintItems = computed(() => this.visible() as Array<Sprint | SprintAllocation>);
  readonly releases = computed(() => this.visible() as ReleaseItem[]);
  readonly feedbackItems = computed(() => this.visible() as Feedback[]);
  readonly workLinks = computed(() => this.visible() as WorkLink[]);
  readonly date = formatDate;
  readonly names = names;
  readonly short = truncate;
  readonly relative = (timestamp: number) => formatRelativeTime(new Date(timestamp).toISOString());

  constructor() {
    addIcons({ chevronDownOutline, chevronForwardOutline, closeOutline, openOutline, refreshOutline });
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

  load(refresh = false): void {
    const filters: Record<string, string> = this.feature.kind === 'work-logs' ? this.filters.getRawValue() : {};
    if (filters['from'] && filters['to'] && filters['from'] > filters['to']) {
      this.error.set('The start date must be before the end date.');
      this.loading.set(false);
      return;
    }
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.hasMore.set(false);
    this.items.set([]);
    this.request = this.feature
      .list(this.selected(), filters, refresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.items.set(response.data);
          this.count.set(response.count);
          this.hasMore.set(response.hasMore);
          this.updatedAt.set(this.feature.updatedAt(this.selected(), filters));
          this.loading.set(false);
        },
        error: error => {
          this.error.set(apiError(error));
          this.loading.set(false);
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

  isSprint(item: Sprint | SprintAllocation): item is Sprint {
    return 'sprint' in item;
  }

  progress(item: Sprint): number {
    return item.availableDays > 0
      ? Math.min(100, Math.max(0, Math.round((item.allocatedDays / item.availableDays) * 100)))
      : 0;
  }

  currentSprint(item: Jira) {
    return item.sprints?.at(-1) ?? null;
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

  safeLink(item: WorkLink): string | null {
    return safeUrl(item.url);
  }

  linkInitial(item: WorkLink): string {
    return (item.type || item.link || 'L').trim().slice(0, 1).toUpperCase();
  }

  async openLink(item: WorkLink): Promise<void> {
    const url = this.safeLink(item);
    if (url) await this.links.open(url);
  }

  private searchText(item: DomainItem): string {
    if ('update' in item)
      return [item.update, item.category, item.type, item.workMode, jiraLabel(item.jiras)].join(' ').toLowerCase();
    if ('jiraKey' in item)
      return [item.jiraKey, item.summary, item.status, item.tags.join(' '), names(item.sprints)]
        .join(' ')
        .toLowerCase();
    if ('sprint' in item) return [item.sprint, names(item.projects)].join(' ').toLowerCase();
    if ('allocation' in item) return [item.allocation, item.notes].join(' ').toLowerCase();
    if ('releaseItem' in item)
      return [item.releaseItem, item.componentName, item.deploymentType, item.versionNumber, jiraLabel(item.jiras)]
        .join(' ')
        .toLowerCase();
    if ('feedback' in item)
      return [item.feedback, item.feedbackFrom, item.context, item.feedbackType, item.details].join(' ').toLowerCase();
    return [item.link, item.type, item.notes, names(item.projects)].join(' ').toLowerCase();
  }

  private saveNavigationState(): void {
    this.navigationState.save(this.feature.kind, { selected: this.selected(), search: this.search() });
  }

  private viewToken(label: string): string {
    return label.toLowerCase().replace(/\s+/g, '-');
  }
}
