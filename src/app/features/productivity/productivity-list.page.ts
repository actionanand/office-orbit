import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import {
  IonButton,
  IonCheckbox,
  IonSegment,
  IonSegmentButton,
  IonLabel,
  IonContent,
  IonHeader,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { addOutline, calendarOutline, pencilOutline, refreshOutline, trashOutline } from 'ionicons/icons';
import { Subject, debounceTime, firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge.component';
import {
  DomainItem,
  Memo,
  MemoQueryFilters,
  ResourceMetadataResponse,
  Task,
  TaskQueryFilters,
  Todo,
  TodoQueryFilters,
} from '../../shared/models/api.models';
import { metadataOptions, optionId, todayIso } from '../../shared/utils/editor';
import { formatDate, formatDateTime, names, truncate } from '../../shared/utils/format';
import { ProductivityEditorComponent } from './productivity-editor.component';
import { ProductivityNavComponent } from './productivity-nav.component';
import { ProductivityKind, ProductivityService } from './productivity.service';
import { TodoComputedService } from './todo-computed.service';
import { AdjustedReminder, recurrenceSummary, todoViewFilters } from './todo-recurrence';
import { WorkCalendarComponent } from './work-calendar.component';

type View = { label: string; key: string };

@Component({
  selector: 'app-productivity-list',
  imports: [
    IonSegment,
    IonSegmentButton,
    IonLabel,
    IonCheckbox,
    WorkCalendarComponent,
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    StatePanelComponent,
    StatusBadgeComponent,
    ProductivityEditorComponent,
    ProductivityNavComponent,
  ],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar
        ><ion-title>Productivity</ion-title
        ><ion-button slot="end" fill="clear" aria-label="Refresh {{ heading() }}" (click)="load(true)"
          ><ion-icon name="refresh-outline" slot="icon-only" /></ion-button></ion-toolbar
    ></ion-header>
    <ion-content
      ><main class="page-wrap productivity-page">
        <div class="page-action-row">
          <app-page-header [title]="heading()" [description]="description()" />
          <div class="todo-header-actions">
            @if (kind === 'todos') {
              <ion-button fill="clear" aria-label="Work calendar settings" (click)="calendarOpen.set(true)"
                ><ion-icon name="calendar-outline" slot="icon-only"
              /></ion-button>
            }
            <ion-button (click)="openEditor(null)"
              ><ion-icon name="add-outline" slot="start" />Add {{ singular() }}</ion-button
            >
          </div>
        </div>
        <app-productivity-nav />
        @if (kind === 'todos') {
          <ion-segment
            class="todo-view-tabs"
            [scrollable]="true"
            [value]="selectedView()"
            (ionChange)="todoViewChanged($event.detail.value)"
            aria-label="To Do views">
            @for (view of views(); track view.key) {
              <ion-segment-button [value]="view.key"
                ><ion-label>{{ view.label }}</ion-label></ion-segment-button
              >
            }
          </ion-segment>
        } @else {
          <div class="productivity-tabs" role="tablist" [attr.aria-label]="heading() + ' views'">
            @for (view of views(); track view.key) {
              <button
                type="button"
                role="tab"
                [attr.aria-selected]="selectedView() === view.key"
                [class.active]="selectedView() === view.key"
                (click)="selectView(view.key)">
                {{ view.label }}
              </button>
            }
          </div>
        }
        <label class="loaded-search productivity-search"
          >Search<input
            type="search"
            placeholder="Search {{ heading() }}"
            [value]="search()"
            (input)="searchChanged($event)"
        /></label>
        <div class="selection-toolbar" aria-live="polite">
          <span>{{ selectedIds().length ? selectedIds().length + ' / 25 selected' : count() + ' loaded' }}</span
          ><span>
            @if (items().length) {
              <ion-button fill="clear" size="small" (click)="selectVisible()">Select visible</ion-button>
            }
            @if (selectedIds().length) {
              @if (selectedItem(); as selected) {
                @if (kind !== 'memos') {
                  <ion-button fill="outline" size="small" (click)="toggleDone(selected)">
                    {{ isDone(selected) ? 'Reopen' : 'Complete' }}
                  </ion-button>
                }
              }
              <ion-button fill="clear" size="small" (click)="selectedIds.set([])">Clear</ion-button
              ><ion-button
                color="danger"
                fill="outline"
                size="small"
                (click)="deleteSelected()"
                [disabled]="selectedIds().length > 25"
                [attr.aria-label]="
                  'Delete ' + selectedIds().length + ' selected item' + (selectedIds().length === 1 ? '' : 's')
                "
                ><ion-icon name="trash-outline" slot="start" /><span class="selection-delete-label"
                  >Delete selected</span
                ></ion-button
              >
            }
          </span>
        </div>
        @for (warning of reminderWarnings(); track warning) {
          <p class="content-warning" role="status">{{ warning }}</p>
        }
        @if (loading()) {
          <app-loading-skeleton />
        } @else if (error()) {
          <app-state-panel [error]="error()" (retry)="load(true)" />
        } @else if (!items().length) {
          <app-state-panel [title]="emptyTitle()" message="Try another view or add a new item." />
        } @else {
          <section class="productivity-list" [attr.aria-label]="heading()">
            @for (item of items(); track item.id) {
              <article
                class="productivity-row"
                [class.todo-row]="kind === 'todos'"
                [class.completed]="isDone(item)"
                [class.urgent]="isUrgent(item)">
                <span class="selection-check"
                  ><ion-checkbox
                    [attr.aria-label]="'Select ' + title(item)"
                    [checked]="selectedIds().includes(item.id)"
                    [disabled]="selectionLimitReached() && !selectedIds().includes(item.id)"
                    (ionChange)="toggleSelection(item.id)"
                /></span>
                <div class="productivity-copy" [class.clickable]="kind === 'memos'" (click)="openItem(item)">
                  <div class="productivity-row-heading">
                    <strong>{{ title(item) }}</strong
                    ><span class="badge-line">
                      @for (badge of badges(item); track badge) {
                        <app-status-badge [label]="badge" />
                      }
                    </span>
                  </div>
                  @if (recurrenceLabel(item)) {
                    <p class="todo-recurrence-summary">{{ recurrenceLabel(item) }}</p>
                  }
                  <span class="meta-line">
                    @for (meta of metadataLine(item); track meta) {
                      <span>{{ meta }}</span>
                    }
                  </span>
                  @if (preview(item)) {
                    <span class="preview">{{ preview(item) }}</span>
                  }
                  @for (reminder of adjustments()[item.id] ?? []; track reminder.scheduledDate) {
                    <div class="todo-reminder">
                      <span>Scheduled: {{ formatDate(reminder.scheduledDate) }}</span
                      ><span>Reminder: {{ formatDate(reminder.reminderDate) }}</span
                      ><span>Reason: {{ reminder.reason }}</span>
                    </div>
                  }
                  @if (setupIssue(item)) {
                    <p class="form-error">{{ setupIssue(item) }}</p>
                  }
                </div>
                <div class="productivity-actions">
                  @if ('toDo' in item && item.dueDate) {
                    <span class="productivity-action-date">Due {{ formatDate(item.dueDate) }}</span>
                  }
                  @if ('status' in item) {
                    <ion-select
                      class="inline-status-select"
                      interface="popover"
                      [attr.aria-label]="'Status for ' + title(item)"
                      [value]="statusOptionId(item)"
                      (ionChange)="changeStatus(item, $event.detail.value)">
                      @for (option of statusOptions(); track option.id) {
                        <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                      }
                    </ion-select>
                  }
                  @if (kind === 'memos') {
                    <ion-button fill="clear" size="small" (click)="togglePin(item)">{{
                      isPinned(item) ? 'Unpin' : 'Pin'
                    }}</ion-button>
                    <ion-button fill="clear" size="small" [routerLink]="['/app/productivity/memos', item.id]"
                      >Open</ion-button
                    >
                  }
                  <ion-button
                    class="productivity-edit-button"
                    fill="clear"
                    size="small"
                    [attr.aria-label]="'Edit ' + title(item)"
                    (click)="openEditor(item)"
                    ><ion-icon name="pencil-outline" slot="start" /><span class="productivity-edit-label"
                      >Edit</span
                    ></ion-button
                  >
                  <ion-button fill="clear" size="small" color="danger" (click)="deleteOne(item)"
                    ><ion-icon name="trash-outline" slot="icon-only" /><span class="sr-only"
                      >Delete {{ title(item) }}</span
                    ></ion-button
                  >
                </div>
              </article>
            }
          </section>
        }
        @if (hasMore()) {
          <ion-button class="load-more" fill="outline" [disabled]="loadingMore()" (click)="load(false, true)">{{
            loadingMore() ? 'Loading…' : 'Load more'
          }}</ion-button>
        }
        <app-productivity-editor
          [open]="editorOpen()"
          [kind]="kind"
          [item]="editing()"
          (closed)="closeEditor()"
          (saved)="saved($event)" />
        @if (kind === 'todos' && calendarOpen()) {
          <app-work-calendar [open]="true" (closed)="calendarOpen.set(false)" (saved)="load(true)" />
        }</main
    ></ion-content>`,
})
export class ProductivityListPage {
  readonly kind = inject(ActivatedRoute).snapshot.data['kind'] as ProductivityKind;
  private readonly api = inject(ProductivityService);
  private readonly snackbar = inject(SnackbarService);
  private readonly confirmation = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly computedTodos = inject(TodoComputedService);
  private requestGeneration = 0;
  readonly calendarOpen = signal(false);
  readonly adjustments = signal<Partial<Record<string, AdjustedReminder[]>>>({});
  readonly reminderWarnings = signal<string[]>([]);
  private readonly searchChanges = new Subject<string>();
  readonly items = signal<DomainItem[]>([]);
  readonly count = signal(0);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal('');
  readonly hasMore = signal(false);
  readonly selectedView = signal('all');
  readonly search = signal('');
  readonly selectedIds = signal<string[]>([]);
  readonly selectionLimitReached = computed(() => this.selectedIds().length >= 25);
  readonly selectedItem = computed(() => {
    const ids = this.selectedIds();
    return ids.length === 1 ? (this.items().find(item => item.id === ids[0]) ?? null) : null;
  });
  readonly metadata = signal<ResourceMetadataResponse | null>(null);
  readonly editorOpen = signal(false);
  readonly editing = signal<DomainItem | null>(null);
  readonly views = computed<View[]>(() =>
    this.kind === 'todos'
      ? [
          { label: 'All', key: 'all' },
          { label: 'Open', key: 'open' },
          { label: 'Today', key: 'today' },
          { label: 'Upcoming', key: 'upcoming' },
          { label: 'Special', key: 'special' },
          { label: 'Recurring', key: 'recurring' },
          { label: 'Overdue', key: 'overdue' },
          { label: 'Done', key: 'done' },
          { label: 'Needs Attention', key: 'attention' },
        ]
      : this.kind === 'tasks'
        ? [
            { label: 'All', key: 'all' },
            { label: 'Active', key: 'active' },
            { label: 'My Tasks', key: 'mine' },
            { label: 'From Seniors', key: 'seniors' },
            { label: 'Delegated', key: 'delegated' },
            { label: 'Waiting On', key: 'waiting' },
            { label: 'Follow-up', key: 'followup' },
            { label: 'Overdue', key: 'overdue' },
            { label: 'Done', key: 'done' },
          ]
        : [
            { label: 'All', key: 'all' },
            { label: 'Pinned', key: 'pinned' },
            { label: 'Commands', key: 'commands' },
            { label: 'Prompts', key: 'prompts' },
            { label: 'Recently Updated', key: 'recent' },
          ],
  );
  readonly heading = computed(() =>
    this.kind === 'todos' ? 'To Do' : this.kind === 'tasks' ? 'Tasks & Follow-ups' : 'Memos',
  );
  readonly description = computed(() =>
    this.kind === 'todos'
      ? 'Capture the next action and keep due work visible.'
      : this.kind === 'tasks'
        ? 'Track commitments, ownership, and follow-ups.'
        : 'Keep reusable notes, commands, and prompts close at hand.',
  );
  readonly formatDate = formatDate;
  readonly formatDateTime = formatDateTime;

  constructor() {
    addIcons({ addOutline, calendarOutline, pencilOutline, refreshOutline, trashOutline });
    this.destroyRef.onDestroy(() => this.requestGeneration++);
    this.searchChanges.pipe(debounceTime(350), takeUntilDestroyed()).subscribe(() => this.load());
    this.load();
    this.api
      .metadata(this.kind)
      .pipe(takeUntilDestroyed())
      .subscribe({ next: value => this.metadata.set(value) });
  }
  singular(): string {
    return this.kind === 'todos' ? 'To Do' : this.kind === 'tasks' ? 'Task' : 'Memo';
  }
  searchChanged(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.search.set(event.target.value);
      this.searchChanges.next(event.target.value);
    }
  }
  selectView(view: string): void {
    this.selectedView.set(view);
    this.selectedIds.set([]);
    this.load();
  }
  todoViewChanged(value: unknown): void {
    if (typeof value === 'string' && this.views().some(view => view.key === value)) this.selectView(value);
  }
  load(refresh = false, more = false): void {
    if (more && this.loadingMore()) return;
    const generation = ++this.requestGeneration;
    const view = this.selectedView();
    this.adjustments.set({});
    this.reminderWarnings.set([]);
    this.loading.set(!more);
    this.loadingMore.set(more);
    this.error.set('');
    if (this.kind === 'todos' && (view === 'today' || view === 'special')) {
      this.hasMore.set(false);
      this.computedTodos
        .load(view, todayIso(), this.search(), refresh)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: result => {
            if (generation !== this.requestGeneration) return;
            this.items.set(result.data);
            this.count.set(result.data.length);
            this.adjustments.set(result.adjustments);
            this.reminderWarnings.set(result.warnings);
            this.loading.set(false);
            this.loadingMore.set(false);
          },
          error: error => {
            if (generation === this.requestGeneration) {
              this.error.set(apiError(error));
              this.loading.set(false);
              this.loadingMore.set(false);
            }
          },
        });
      return;
    }
    this.api
      .list(this.kind, this.filters(), refresh, more)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: result => {
          if (generation !== this.requestGeneration) return;
          this.items.set(result.data);
          this.count.set(result.count);
          this.hasMore.set(result.hasMore);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: error => {
          if (generation !== this.requestGeneration) return;
          this.error.set(apiError(error));
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }
  filters(): TodoQueryFilters | TaskQueryFilters | MemoQueryFilters | null {
    const q = this.search().trim() || undefined;
    const view = this.selectedView();
    const today = todayIso();
    if ((view === 'all' && !q) || (this.kind === 'memos' && view === 'recent' && !q)) return null;
    if (this.kind === 'todos') return todoViewFilters(view, today, q);
    if (this.kind === 'tasks')
      return {
        ...(view !== 'all' ? { statuses: view === 'done' ? ['Done'] : ['Not started', 'In progress'] } : {}),
        ...(view === 'mine'
          ? { responsibilities: ['My Task'] }
          : view === 'seniors'
            ? { requestedByTypes: ['Manager', 'Team Lead', 'Senior', 'Client'] }
            : view === 'delegated'
              ? { responsibilities: ['Delegated'] }
              : view === 'waiting'
                ? { responsibilities: ['Waiting On'] }
                : view === 'followup'
                  ? { followUpOnOrBefore: today }
                  : view === 'overdue'
                    ? { dueBefore: today }
                    : {}),
        ...(q ? { q } : {}),
      };
    return {
      ...(view === 'pinned'
        ? { pinned: true }
        : view === 'commands'
          ? { categories: ['Command'] }
          : view === 'prompts'
            ? { categories: ['Prompt'] }
            : {}),
      ...(q ? { q } : {}),
    };
  }
  title(item: DomainItem): string {
    return 'toDo' in item ? item.toDo : 'task' in item ? item.task : 'memo' in item ? item.memo : '';
  }
  badges(item: DomainItem): string[] {
    if ('toDo' in item)
      return [
        item.workdayAdjust ? 'Workday adjust' : '',
        item.setupIssue ? 'Needs attention' : '',
        this.adjustments()[item.id]?.length ? 'Early reminder' : '',
      ].filter(Boolean);
    if ('task' in item)
      return [
        item.priority,
        item.responsibility,
        item.dueDate && item.dueDate < todayIso() && !this.isDone(item) ? 'Overdue' : null,
      ].filter((value): value is string => Boolean(value));
    if ('memo' in item) return [item.pinned ? 'Pinned' : '', item.category ?? '', ...item.tags].filter(Boolean);
    return [];
  }
  metadataLine(item: DomainItem): string[] {
    if ('toDo' in item) return item.dueDate ? [`Due ${formatDate(item.dueDate)}`] : [];
    if ('task' in item)
      return [
        item.dueDate ? `Due ${formatDate(item.dueDate)}` : '',
        item.followUpDate ? `Follow up ${formatDate(item.followUpDate)}` : '',
        item.requestedBy
          ? `Requested by ${item.requestedBy}${item.requestedByType ? ` (${item.requestedByType})` : ''}`
          : '',
        item.assignedTo
          ? `Assigned to ${item.assignedTo}${item.assignedToType ? ` (${item.assignedToType})` : ''}`
          : '',
        names(item.companies),
        ...(item.jiras?.map(jira => jira.key) ?? []),
      ].filter(Boolean);
    if ('memo' in item) return item.lastEditedTime ? [`Updated ${formatDateTime(item.lastEditedTime)}`] : [];
    return [];
  }
  preview(item: DomainItem): string {
    return 'notes' in item ? truncate(item.notes, 180) : '';
  }
  setupIssue(item: DomainItem): string {
    return 'toDo' in item ? item.setupIssue : '';
  }
  recurrenceLabel(item: DomainItem): string {
    return 'toDo' in item ? recurrenceSummary(item) : '';
  }
  isDone(item: DomainItem): boolean {
    return ('status' in item && item.status?.toLowerCase() === 'done') ?? false;
  }
  statusOptions() {
    return metadataOptions(this.metadata(), 'statusOptionId');
  }
  statusOptionId(item: DomainItem): string {
    return 'status' in item ? optionId(this.metadata(), 'statusOptionId', item.status) : '';
  }
  isPinned(item: DomainItem): item is Memo {
    return 'memo' in item && item.pinned;
  }
  isUrgent(item: DomainItem): boolean {
    return (
      'task' in item &&
      (item.priority?.toLowerCase() === 'urgent' ||
        Boolean(item.dueDate && item.dueDate < todayIso() && !this.isDone(item)))
    );
  }
  openItem(item: DomainItem): void {
    if (this.kind === 'memos') void this.router.navigate(['/app/productivity/memos', item.id]);
  }
  openEditor(item: DomainItem | null): void {
    this.editing.set(item);
    this.editorOpen.set(true);
  }
  closeEditor(): void {
    this.editorOpen.set(false);
    this.editing.set(null);
  }
  saved(item: DomainItem): void {
    const editing = this.editing() !== null;
    this.items.update(items =>
      items.some(value => value.id === item.id)
        ? items.map(value => (value.id === item.id ? item : value))
        : [item, ...items],
    );
    this.closeEditor();
    this.snackbar.success(`${this.singular()} ${editing ? 'updated' : 'added'}.`);
    this.load(true);
  }
  toggleSelection(id: string): void {
    this.selectedIds.update(ids =>
      ids.includes(id)
        ? ids.filter(value => value !== id)
        : ids.length >= 25
          ? (this.snackbar.error('Up to 25 items can be deleted at once.'), ids)
          : [...ids, id],
    );
  }
  selectVisible(): void {
    this.selectedIds.set(
      this.items()
        .slice(0, 25)
        .map(item => item.id),
    );
    if (this.items().length > 25) {
      this.snackbar.error('Selected the first 25 items. Bulk delete is limited to 25.');
    }
  }
  async deleteOne(item: DomainItem): Promise<void> {
    const confirmed = await this.confirmation.confirm({
      title: `Delete ${this.singular()}?`,
      message: `“${this.title(item)}” will be permanently deleted. This action cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await firstValueFrom(this.api.delete(this.kind, item.id));
      this.items.update(items => items.filter(value => value.id !== item.id));
      this.snackbar.success(`${this.singular()} deleted.`);
      this.selectedIds.update(ids => ids.filter(id => id !== item.id));
      if (this.kind === 'todos') this.load(true);
    } catch (error) {
      this.snackbar.error(apiError(error));
    }
  }
  async deleteSelected(): Promise<void> {
    const ids = this.selectedIds();
    if (!ids.length) return;
    if (ids.length > 25) {
      this.snackbar.error('Up to 25 items can be deleted at once.');
      return;
    }
    const confirmed = await this.confirmation.confirm({
      title: `Delete ${ids.length} selected item${ids.length === 1 ? '' : 's'}?`,
      message: `The selected ${this.heading().toLowerCase()} will be permanently deleted. This action cannot be undone.`,
      confirmLabel: `Delete ${ids.length}`,
      danger: true,
    });
    if (!confirmed) return;
    try {
      const result = await firstValueFrom(this.api.bulkDelete(this.kind, ids));
      this.selectedIds.set([]);
      this.load(true);
      if (result.allSucceeded) this.snackbar.success(`${result.deleted} deleted.`);
      else this.snackbar.error(`${result.deleted} deleted, ${result.failed.length} could not be deleted.`);
    } catch (error) {
      this.snackbar.error(error instanceof Error && error.message.includes('25') ? error.message : apiError(error));
    }
  }
  async toggleDone(item: DomainItem): Promise<void> {
    if (!('status' in item)) return;
    const done = this.isDone(item);
    const options = metadataOptions(this.metadata(), 'statusOptionId');
    const target = done
      ? options.find(option => ['not started', 'in progress'].includes(option.name.toLowerCase()))
      : options.find(option => option.name.toLowerCase() === 'done');
    if (!target) {
      this.snackbar.error('The required status is unavailable. Refresh and try again.');
      return;
    }
    try {
      const body =
        this.kind === 'tasks'
          ? {
              statusOptionId: target.id,
              completedDate: done
                ? null
                : 'completedDate' in item && item.completedDate
                  ? item.completedDate
                  : todayIso(),
            }
          : { statusOptionId: target.id };
      const response = await firstValueFrom(this.api.patch<DomainItem, typeof body>(this.kind, item.id, body));
      this.items.update(items => items.map(value => (value.id === item.id ? response.data : value)));
      this.snackbar.success(done ? 'Item reopened.' : 'Item completed.');
      if (this.kind === 'todos') this.load(true);
    } catch (error) {
      this.snackbar.error(apiError(error));
    }
  }
  async changeStatus(item: DomainItem, statusOptionId: string | null | undefined): Promise<void> {
    if (!('status' in item) || !statusOptionId || statusOptionId === this.statusOptionId(item)) return;
    const selected = this.statusOptions().find(option => option.id === statusOptionId);
    if (!selected) return;
    const completed = selected.name.toLowerCase() === 'done';
    try {
      const body =
        this.kind === 'tasks'
          ? {
              statusOptionId,
              completedDate: completed
                ? 'completedDate' in item && item.completedDate
                  ? item.completedDate
                  : todayIso()
                : null,
            }
          : { statusOptionId };
      const response = await firstValueFrom(this.api.patch<DomainItem, typeof body>(this.kind, item.id, body));
      this.items.update(items => items.map(value => (value.id === item.id ? response.data : value)));
      this.snackbar.success('Status updated.');
      if (this.kind === 'todos') this.load(true);
    } catch (error) {
      this.snackbar.error(apiError(error));
    }
  }
  async togglePin(item: DomainItem): Promise<void> {
    if (!('memo' in item)) return;
    const pinned = !item.pinned;
    try {
      const response = await firstValueFrom(this.api.patch<Memo, { pinned: boolean }>('memos', item.id, { pinned }));
      this.items.update(items => items.map(value => (value.id === item.id ? response.data : value)));
      this.snackbar.success(pinned ? 'Memo pinned.' : 'Memo unpinned.');
      if (this.selectedView() === 'pinned' && !pinned) this.load(true);
    } catch (error) {
      this.snackbar.error(apiError(error));
    }
  }
  emptyTitle(): string {
    return `No ${this.selectedView() === 'all' ? 'items' : this.selectedView()} found`;
  }
}
