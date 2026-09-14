import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, cloudUploadOutline, documentTextOutline, refreshOutline } from 'ionicons/icons';
import { Subject, debounceTime, firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import {
  ReferenceImportAccepted,
  ReferenceImportStatus,
  ReferenceLibraryItem,
  ReferenceLibraryQueryFilters,
  ResourceMetadataResponse,
} from '../../shared/models/api.models';
import { metadataOptions } from '../../shared/utils/editor';
import { formatDateTime } from '../../shared/utils/format';
import { ProductivityNavComponent } from './productivity-nav.component';
import { ProductivityService } from './productivity.service';
import { LocalMarkdownPreviewComponent } from './local-markdown-preview.component';
import { environment } from '../../../environments/environment';

export const MAX_MARKDOWN_BYTES = environment.markdownFileMaxBytes;
export function validateMarkdownFile(file: File | null): string {
  if (!file) return 'Choose a Markdown file.';
  if (file.size === 0) return 'Choose a non-empty Markdown file.';
  if (!/\.(md|markdown)$/i.test(file.name)) return 'Choose a .md or .markdown file.';
  if (file.size > environment.markdownFileMaxBytes)
    return `The Markdown file must be ${environment.markdownFileMaxBytes.toLocaleString('en-US')} bytes or smaller.`;
  return '';
}

@Component({
  selector: 'app-reference-library',
  imports: [
    NgTemplateOutlet,
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    StatePanelComponent,
    ProductivityNavComponent,
    LocalMarkdownPreviewComponent,
  ],
  template: `<ion-header class="ion-no-border">
      <ion-toolbar>
        <ion-title>Reference Library</ion-title>
        <ion-button slot="end" fill="clear" aria-label="Refresh Reference Library" (click)="refresh()">
          <ion-icon name="refresh-outline" slot="icon-only" />
        </ion-button>
      </ion-toolbar>
    </ion-header>
    <ion-content>
      <main class="page-wrap productivity-page">
        <app-productivity-nav />
        <div class="page-action-row">
          <app-page-header title="Reference Library" description="Search and organize reusable knowledge." />
          <div class="reference-file-actions">
            <div class="local-preview-action">
              <ion-button fill="outline" (click)="previewFileInput.click()">
                <ion-icon name="document-text-outline" slot="start" />Preview Markdown
              </ion-button>
              <span>Local only · no upload</span>
            </div>
            <ion-button (click)="fileInput.click()">
              <ion-icon name="cloud-upload-outline" slot="start" />Import Markdown
            </ion-button>
          </div>
          <input
            #previewFileInput
            class="visually-hidden-file"
            type="file"
            accept=".md,.markdown,text/markdown"
            aria-label="Choose a Markdown file to preview locally"
            (change)="selectPreviewFile($event)" />
          <input
            #fileInput
            class="visually-hidden-file"
            type="file"
            accept=".md,.markdown,text/markdown"
            aria-label="Choose a Markdown file"
            aria-describedby="reference-file-error"
            (change)="selectFile($event)" />
        </div>
        @if (previewMarkdown()) {
          <app-local-markdown-preview
            [filename]="previewFilename()"
            [markdown]="previewMarkdown()"
            (dismissed)="closePreview()" />
        }

        <section class="reference-filters" aria-label="Reference filters">
          <ion-input
            label="Search articles"
            labelPlacement="stacked"
            fill="outline"
            type="search"
            placeholder="Search article titles"
            [value]="search()"
            (ionInput)="searchChanged($event)" />
          <ion-select
            label="Category"
            labelPlacement="stacked"
            fill="outline"
            interface="popover"
            [value]="category()"
            (ionChange)="categoryChanged($event.detail.value)">
            <ion-select-option value="">All categories</ion-select-option>
            @for (option of categoryOptions(); track option.id) {
              <ion-select-option [value]="option.name">{{ option.name }}</ion-select-option>
            }
          </ion-select>
          <ion-select
            label="Tags"
            labelPlacement="stacked"
            fill="outline"
            interface="alert"
            multiple="true"
            placeholder="All tags"
            [value]="tags()"
            (ionChange)="tagsChanged($event.detail.value)">
            @for (option of tagOptions(); track option.id) {
              <ion-select-option [value]="option.name">{{ option.name }}</ion-select-option>
            }
          </ion-select>
          <ion-select
            label="Group by"
            labelPlacement="stacked"
            fill="outline"
            interface="popover"
            [value]="groupBy()"
            (ionChange)="setGroup($event.detail.value)">
            <ion-select-option value="none">None</ion-select-option>
            <ion-select-option value="category">Category</ion-select-option>
          </ion-select>
        </section>

        @if (file(); as selectedFile) {
          <section class="import-panel reference-import-form" aria-labelledby="import-heading">
            <div class="import-heading-row">
              <div>
                <strong id="import-heading">Import Markdown</strong>
                <span>{{ selectedFile.name }} · {{ fileSize(selectedFile.size) }}</span>
              </div>
              <ion-button fill="clear" aria-label="Cancel Markdown import" (click)="clearFile()">
                <ion-icon name="close-outline" slot="icon-only" />
              </ion-button>
            </div>
            <div class="reference-import-fields">
              <ion-input
                label="Title (optional)"
                labelPlacement="stacked"
                fill="outline"
                [value]="importTitle()"
                (ionInput)="importTitle.set(stringValue($event.detail.value))" />
              <ion-select
                label="Category (optional)"
                labelPlacement="stacked"
                fill="outline"
                interface="popover"
                [value]="importCategoryId()"
                (ionChange)="importCategoryId.set(stringValue($event.detail.value))">
                <ion-select-option value="">None</ion-select-option>
                @for (option of categoryOptions(); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
              <ion-select
                label="Tags (optional)"
                labelPlacement="stacked"
                fill="outline"
                interface="alert"
                multiple="true"
                [value]="importTagIds()"
                (ionChange)="importTagIds.set(stringArray($event.detail.value))">
                @for (option of tagOptions(); track option.id) {
                  <ion-select-option [value]="option.id">{{ option.name }}</ion-select-option>
                }
              </ion-select>
            </div>
            <div class="editor-actions">
              <ion-button fill="clear" [disabled]="importing()" (click)="clearFile()">Cancel</ion-button>
              <ion-button [disabled]="importing()" (click)="upload()">
                <ion-icon name="cloud-upload-outline" slot="start" />{{ importStatus() || 'Import' }}
              </ion-button>
            </div>
          </section>
        }
        @if (fileError()) {
          <p id="reference-file-error" class="form-error" role="alert">{{ fileError() }}</p>
        }
        @if (metadataError()) {
          <p class="content-warning" role="alert">{{ metadataError() }}</p>
        }

        @if (loading()) {
          <app-loading-skeleton />
        } @else if (error()) {
          <app-state-panel [error]="error()" (retry)="load(true)" />
        } @else if (!items().length) {
          <app-state-panel
            title="No reference articles found"
            message="Adjust the filters or import a Markdown article." />
        } @else if (groupBy() === 'category') {
          @for (group of groups(); track group.name) {
            <section class="reference-group" [attr.aria-labelledby]="'reference-group-' + $index">
              <h2 [id]="'reference-group-' + $index">{{ group.name }}</h2>
              <div class="reference-list">
                @for (item of group.items; track item.id) {
                  <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: item }" />
                }
              </div>
            </section>
          }
          @if (hasMore()) {
            <p class="pagination-notice">Groups contain the currently loaded articles. Load more to expand them.</p>
          }
        } @else {
          <section class="reference-list" aria-label="Reference Library">
            @for (item of items(); track item.id) {
              <ng-container [ngTemplateOutlet]="row" [ngTemplateOutletContext]="{ $implicit: item }" />
            }
          </section>
        }
        <ng-template #row let-item>
          <a class="reference-row" [routerLink]="['/app/productivity/reference-library', item.id]">
            <strong>{{ item.article || 'Untitled reference' }}</strong>
            <span class="reference-badges">
              @if (item.category) {
                <span class="status-badge">{{ item.category }}</span>
              }
              @for (tag of item.tags; track tag) {
                <span class="status-badge">{{ tag }}</span>
              }
            </span>
            <span>Last edited {{ formatDateTime(item.lastEditedTime) }}</span>
          </a>
        </ng-template>
        @if (hasMore()) {
          <ion-button class="load-more" fill="outline" [disabled]="loadingMore()" (click)="load(false, true)">
            {{ loadingMore() ? 'Loading…' : 'Load more' }}
          </ion-button>
        }
      </main>
    </ion-content>`,
})
export class ReferenceLibraryPage {
  private readonly api = inject(ProductivityService);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly searchRequests = new Subject<void>();
  private pollController?: AbortController;
  private requestGeneration = 0;
  private previewReadGeneration = 0;

  readonly items = signal<ReferenceLibraryItem[]>([]);
  readonly metadata = signal<ResourceMetadataResponse | null>(null);
  readonly categoryOptions = computed(() => metadataOptions(this.metadata(), 'categoryOptionId'));
  readonly tagOptions = computed(() => metadataOptions(this.metadata(), 'tagOptionIds'));
  readonly groups = computed(() => {
    const result = new Map<string, ReferenceLibraryItem[]>();
    for (const item of this.items()) {
      const name = item.category || 'Uncategorized';
      result.set(name, [...(result.get(name) ?? []), item]);
    }
    return [...result].map(([name, items]) => ({ name, items }));
  });
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal('');
  readonly metadataError = signal('');
  readonly hasMore = signal(false);
  readonly search = signal('');
  readonly category = signal('');
  readonly tags = signal<string[]>([]);
  readonly groupBy = signal<'none' | 'category'>('none');
  readonly file = signal<File | null>(null);
  readonly importTitle = signal('');
  readonly importCategoryId = signal('');
  readonly importTagIds = signal<string[]>([]);
  readonly fileError = signal('');
  readonly importing = signal(false);
  readonly importStatus = signal('');
  readonly previewFilename = signal('');
  readonly previewMarkdown = signal('');
  readonly formatDateTime = formatDateTime;

  constructor() {
    addIcons({ closeOutline, cloudUploadOutline, documentTextOutline, refreshOutline });
    this.destroyRef.onDestroy(() => {
      this.pollController?.abort();
      this.closePreview();
    });
    this.searchRequests.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.load(true));
    this.loadMetadata();
    this.load();
  }

  refresh(): void {
    this.loadMetadata(true);
    this.load(true);
  }
  load(refresh = false, more = false): void {
    if (this.loadingMore() || (more && !this.hasMore())) return;
    const generation = ++this.requestGeneration;
    this.loading.set(!more);
    this.loadingMore.set(more);
    this.error.set('');
    const filters = this.filters();
    const request = Object.keys(filters).length
      ? this.api.referenceQuery(filters, refresh, more)
      : this.api.referenceList(refresh, more);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: page => {
        if (generation !== this.requestGeneration) return;
        this.items.set(page.data);
        this.hasMore.set(page.hasMore);
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
  searchChanged(event: CustomEvent<{ value?: string | null }>): void {
    this.search.set(this.stringValue(event.detail.value));
    this.requestGeneration += 1;
    this.searchRequests.next();
  }
  categoryChanged(value: unknown): void {
    this.category.set(this.stringValue(value));
    this.load(true);
  }
  tagsChanged(value: unknown): void {
    this.tags.set(this.stringArray(value));
    this.load(true);
  }
  setGroup(value: unknown): void {
    this.groupBy.set(value === 'category' ? 'category' : 'none');
  }
  selectFile(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0] ?? null;
    const error = validateMarkdownFile(file);
    this.fileError.set(error);
    this.file.set(error ? null : file);
    if (file && !error) this.importTitle.set(file.name.replace(/\.(md|markdown)$/i, '').replace(/[-_]+/g, ' '));
    input.value = '';
  }
  async selectPreviewFile(event: Event): Promise<void> {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0] ?? null;
    input.value = '';
    const error = validateMarkdownFile(file);
    this.fileError.set(error);
    if (error || !file) return;
    const generation = ++this.previewReadGeneration;
    try {
      const markdown = await file.text();
      if (generation !== this.previewReadGeneration) return;
      if (!markdown.length) {
        this.fileError.set('Choose a non-empty Markdown file.');
        return;
      }
      this.previewFilename.set(file.name);
      this.previewMarkdown.set(markdown);
    } catch {
      this.fileError.set('The Markdown file could not be read.');
    }
  }
  closePreview(): void {
    this.previewReadGeneration += 1;
    this.previewFilename.set('');
    this.previewMarkdown.set('');
  }
  clearFile(): void {
    this.pollController?.abort();
    this.file.set(null);
    this.importTitle.set('');
    this.importCategoryId.set('');
    this.importTagIds.set([]);
    this.fileError.set('');
    this.importStatus.set('');
  }
  async upload(): Promise<void> {
    const file = this.file();
    const error = validateMarkdownFile(file);
    if (error || !file) {
      this.fileError.set(error);
      return;
    }
    this.importing.set(true);
    this.importStatus.set('Uploading…');
    this.fileError.set('');
    try {
      const response = await firstValueFrom(
        this.api.importMarkdown(file, this.importTitle(), this.importCategoryId(), this.importTagIds()),
      );
      const body = response.body;
      if (!body) throw new Error('The import returned no result.');
      if ('taskId' in body) {
        this.pollController = new AbortController();
        const status = await this.api.pollImport(body as ReferenceImportAccepted, this.pollController.signal, state =>
          this.importStatus.set(this.progressLabel(state)),
        );
        if (status.failed) throw new Error('Notion could not finish the Markdown import.');
      }
      this.api.clearReferenceCache();
      this.snackbar.success('Markdown imported.');
      this.clearFile();
      this.load(true);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      this.fileError.set(error instanceof Error ? error.message : apiError(error));
    } finally {
      this.importing.set(false);
    }
  }
  fileSize(size: number): string {
    return size < 1024 ? `${size} bytes` : `${(size / 1024).toFixed(1)} KB`;
  }
  stringValue(value: unknown): string {
    return typeof value === 'string' ? value : '';
  }
  stringArray(value: unknown): string[] {
    return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
  }
  private filters(): ReferenceLibraryQueryFilters {
    const q = this.search().trim();
    return {
      ...(this.category() ? { categories: [this.category()] } : {}),
      ...(this.tags().length ? { tags: this.tags() } : {}),
      ...(q ? { q } : {}),
    };
  }
  private loadMetadata(refresh = false): void {
    this.api
      .referenceMetadata(refresh)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: metadata => {
          this.metadata.set(metadata);
          this.metadataError.set('');
        },
        error: error => this.metadataError.set(apiError(error)),
      });
  }
  private progressLabel(status: ReferenceImportStatus['status']): string {
    const labels: Record<ReferenceImportStatus['status'], string> = {
      queued: 'Queued…',
      running: 'Processing…',
      retrying: 'Retrying…',
      succeeded: 'Complete',
      failed: 'Failed',
    };
    return labels[status];
  }
}
