import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader,
  IonIcon,
  IonModal,
  IonSearchbar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, searchOutline } from 'ionicons/icons';
import { EMPTY, Subject, Subscription, catchError, map, of, switchMap, takeUntil, timer } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { JiraOption, JiraRef, ListResponse } from '../../shared/models/api.models';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import { JiraPickerService } from './jira-picker.service';

export interface JiraPickerSelection {
  ids: string[];
  jiras: JiraRef[];
}

interface SearchRequest {
  id: number;
  query: string;
  immediate: boolean;
}

interface SearchResult {
  request: SearchRequest;
  response: ListResponse<JiraOption> | null;
  error: string;
}

@Component({
  selector: 'app-jira-picker',
  imports: [
    IonButton,
    IonCheckbox,
    IonContent,
    IonFooter,
    IonHeader,
    IonIcon,
    IonModal,
    IonSearchbar,
    IonSpinner,
    IonTitle,
    IonToolbar,
    StatusBadgeComponent,
  ],
  template: `<div class="jira-picker-field">
      <span class="ionic-field-label">JIRAs</span>
      <div class="jira-picker-summary">
        <div class="jira-picker-summary-copy">
          @if (selectedPreview().length) {
            @for (jira of selectedPreview().slice(0, 3); track jira.id) {
              <span class="jira-picker-chip">{{ jira.jiraKey }}</span>
            }
            @if (selectedPreview().length > 3) {
              <span class="jira-picker-more">+{{ selectedPreview().length - 3 }} more</span>
            }
          } @else {
            <span class="jira-picker-empty-summary">No JIRAs selected</span>
          }
        </div>
        <ion-button type="button" fill="outline" size="small" (click)="openPicker()">
          <ion-icon name="search-outline" slot="start" aria-hidden="true" />Choose JIRAs
        </ion-button>
      </div>
    </div>

    <ion-modal class="jira-picker-modal" [isOpen]="pickerOpen()" (didDismiss)="cancel()">
      <ng-template>
        <ion-header class="ion-no-border">
          <ion-toolbar>
            <ion-title>Select JIRAs</ion-title>
            <ion-button slot="end" fill="clear" aria-label="Close JIRA picker" (click)="cancel()">
              <ion-icon name="close-outline" slot="icon-only" aria-hidden="true" />
            </ion-button>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <div class="jira-picker-body">
            @if (draftSelection().length) {
              <section class="jira-picker-selected" aria-labelledby="jira-selected-heading">
                <h2 id="jira-selected-heading">Selected</h2>
                <div class="jira-picker-selected-list">
                  @for (jira of draftSelection(); track jira.id) {
                    <ion-button
                      type="button"
                      fill="outline"
                      size="small"
                      [attr.aria-label]="'Remove ' + jira.jiraKey"
                      (click)="remove(jira.id)">
                      {{ jira.jiraKey }}<ion-icon name="close-outline" slot="end" aria-hidden="true" />
                    </ion-button>
                  }
                </div>
              </section>
            }

            <section class="jira-picker-search" aria-labelledby="jira-search-heading">
              <h2 id="jira-search-heading">Search other JIRAs</h2>
              <ion-searchbar
                aria-label="Search by JIRA key or summary"
                placeholder="Search by JIRA key or summary"
                [value]="search()"
                [debounce]="0"
                (ionInput)="searchChanged($event)" />
              @if (search().length === 1) {
                <p class="jira-picker-helper">Type at least 2 characters to search all JIRAs.</p>
              }
            </section>

            <section class="jira-picker-results" aria-labelledby="jira-results-heading">
              <div class="jira-picker-results-heading">
                <div>
                  <h2 id="jira-results-heading">{{ search().length >= 2 ? 'Search results' : 'Current Sprint' }}</h2>
                  @if (search().length >= 2) {
                    <p>Searching all JIRAs</p>
                  }
                </div>
                @if (loading()) {
                  <span class="jira-picker-loading" role="status" aria-live="polite">
                    <ion-spinner aria-hidden="true" />Loading JIRAs…
                  </span>
                }
              </div>

              @if (error()) {
                <div class="jira-picker-state" role="alert">
                  <p>{{ error() }}</p>
                  <ion-button type="button" fill="outline" size="small" (click)="retry()">Retry</ion-button>
                </div>
              } @else if (!loading() && search().length !== 1 && !results().length) {
                <div class="jira-picker-state">
                  @if (search().length >= 2) {
                    <p>No JIRAs match “{{ search() }}”.</p>
                  } @else {
                    <p>No JIRAs found in the current Sprint.</p>
                    <small>Use search to find other JIRAs.</small>
                  }
                </div>
              } @else {
                <div class="jira-picker-options">
                  @for (jira of results(); track jira.id) {
                    <ion-checkbox
                      class="jira-picker-option"
                      labelPlacement="end"
                      justify="start"
                      [checked]="isSelected(jira.id)"
                      [attr.aria-label]="'Select ' + jira.jiraKey"
                      (ionChange)="toggle(jira, $event.detail.checked)">
                      <span class="jira-picker-option-copy">
                        <span class="jira-picker-option-heading">
                          <strong>{{ jira.jiraKey }}</strong>
                          @if (jira.status) {
                            <app-status-badge [label]="jira.status" kind="jira-status" />
                          }
                        </span>
                        <span>{{ jira.summary || 'No summary' }}</span>
                        @if (jira.inActiveSprint) {
                          <small>Current Sprint</small>
                        }
                      </span>
                    </ion-checkbox>
                  }
                </div>
                @if (hasMore()) {
                  <ion-button
                    class="jira-picker-load-more"
                    type="button"
                    fill="outline"
                    [disabled]="loadingMore()"
                    (click)="loadMore()">
                    {{ loadingMore() ? 'Loading…' : 'Load more' }}
                  </ion-button>
                }
              }
            </section>
          </div>
        </ion-content>
        <ion-footer class="ion-no-border">
          <ion-toolbar>
            <div class="jira-picker-footer-actions">
              <ion-button type="button" fill="clear" (click)="cancel()">Cancel</ion-button>
              <ion-button type="button" (click)="apply()">Done</ion-button>
            </div>
          </ion-toolbar>
        </ion-footer>
      </ng-template>
    </ion-modal>`,
})
export class JiraPickerComponent {
  readonly selectedIds = input<string[]>([]);
  readonly selectedJiras = input<JiraRef[]>([]);
  readonly selectionChange = output<JiraPickerSelection>();
  readonly pickerOpen = signal(false);
  readonly search = signal('');
  readonly results = signal<JiraOption[]>([]);
  readonly draftSelection = signal<JiraOption[]>([]);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal('');
  readonly hasMore = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly selectedPreview = computed(() => this.seedSelection());
  private readonly service = inject(JiraPickerService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly requests = new Subject<SearchRequest>();
  private readonly cancelRequests = new Subject<void>();
  private requestId = 0;
  private loadMoreRequest?: Subscription;

  constructor() {
    addIcons({ closeOutline, searchOutline });
    this.requests
      .pipe(
        switchMap(request => {
          if (request.query.length === 1) return EMPTY;
          return timer(request.immediate ? 0 : 300).pipe(
            switchMap(() =>
              this.service.query(request.query).pipe(
                takeUntil(this.cancelRequests),
                map(response => ({ request, response, error: '' }) satisfies SearchResult),
                catchError(error => of({ request, response: null, error: apiError(error) } satisfies SearchResult)),
              ),
            ),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe(result => this.receive(result));
    this.destroyRef.onDestroy(() => this.loadMoreRequest?.unsubscribe());
  }

  openPicker(): void {
    this.draftSelection.set(this.seedSelection());
    this.pickerOpen.set(true);
    this.queueSearch('', true);
  }

  searchChanged(event: Event): void {
    const detail = (event as CustomEvent<{ value?: string | null }>).detail;
    this.queueSearch(detail.value ?? '', false);
  }

  retry(): void {
    this.queueSearch(this.search(), true);
  }

  loadMore(): void {
    const cursor = this.nextCursor();
    const query = this.search();
    const requestId = this.requestId;
    if (!cursor || this.loadingMore()) return;
    this.loadingMore.set(true);
    this.loadMoreRequest = this.service
      .query(query, cursor)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          if (requestId !== this.requestId || query !== this.search()) return;
          this.results.set(this.unique([...this.results(), ...response.data]));
          this.enrichSelection(response.data);
          this.hasMore.set(response.hasMore);
          this.nextCursor.set(response.nextCursor);
          this.loadingMore.set(false);
        },
        error: error => {
          if (requestId === this.requestId) this.error.set(apiError(error));
          this.loadingMore.set(false);
        },
      });
  }

  toggle(jira: JiraOption, checked: boolean): void {
    if (checked) this.draftSelection.update(selected => this.unique([...selected, jira]));
    else this.remove(jira.id);
  }

  remove(id: string): void {
    this.draftSelection.update(selected => selected.filter(jira => jira.id !== id));
  }

  isSelected(id: string): boolean {
    return this.draftSelection().some(jira => jira.id === id);
  }

  apply(): void {
    const selected = this.draftSelection();
    this.selectionChange.emit({
      ids: selected.map(jira => jira.id),
      jiras: selected.map(jira => ({ id: jira.id, key: jira.jiraKey, summary: jira.summary })),
    });
    this.pickerOpen.set(false);
  }

  cancel(): void {
    this.cancelRequests.next();
    this.loadMoreRequest?.unsubscribe();
    this.loadMoreRequest = undefined;
    this.requestId += 1;
    this.pickerOpen.set(false);
  }

  private queueSearch(value: string, immediate: boolean): void {
    const query = value.trim();
    if (!immediate && query === this.search()) return;
    this.loadMoreRequest?.unsubscribe();
    this.loadMoreRequest = undefined;
    this.search.set(query);
    this.error.set('');
    this.hasMore.set(false);
    this.nextCursor.set(null);
    this.loadingMore.set(false);
    const request = { id: ++this.requestId, query, immediate };
    if (query.length === 1) {
      this.results.set([]);
      this.loading.set(false);
    } else {
      this.loading.set(true);
    }
    this.requests.next(request);
  }

  private receive(result: SearchResult): void {
    if (result.request.id !== this.requestId) return;
    this.loading.set(false);
    this.error.set(result.error);
    if (!result.response) return;
    this.results.set(this.unique(result.response.data));
    this.enrichSelection(result.response.data);
    this.hasMore.set(result.response.hasMore);
    this.nextCursor.set(result.response.nextCursor);
  }

  private enrichSelection(options: JiraOption[]): void {
    const updates = new Map(options.map(option => [option.id, option]));
    this.draftSelection.update(selected => selected.map(jira => updates.get(jira.id) ?? jira));
  }

  private seedSelection(): JiraOption[] {
    const refs = new Map(this.selectedJiras().map(jira => [jira.id, jira]));
    return this.unique(
      this.selectedIds().map((id, index) => {
        const jira = refs.get(id);
        return {
          id,
          jiraKey: jira?.key || `Selected JIRA ${index + 1}`,
          summary: jira?.summary ?? '',
          status: null,
          inActiveSprint: false,
        };
      }),
    );
  }

  private unique(items: JiraOption[]): JiraOption[] {
    return [...new Map(items.map(item => [item.id, item])).values()];
  }
}
