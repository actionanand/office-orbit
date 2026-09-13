import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { cloudUploadOutline, refreshOutline } from 'ionicons/icons';
import { firstValueFrom } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { PageHeaderComponent } from '../../shared/components/page-header.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { ReferenceImportAccepted, ReferenceLibraryItem } from '../../shared/models/api.models';
import { formatDateTime } from '../../shared/utils/format';
import { ProductivityNavComponent } from './productivity-nav.component';
import { ProductivityService } from './productivity.service';

export const MAX_MARKDOWN_BYTES = 4_500_000;
export function validateMarkdownFile(file: File | null): string {
  if (!file) return 'Choose a Markdown file.';
  if (file.size === 0) return 'Choose a non-empty Markdown file.';
  if (!/\.(md|markdown)$/i.test(file.name)) return 'Choose a .md or .markdown file.';
  if (file.size > MAX_MARKDOWN_BYTES) return 'The Markdown file must be 4.5 MB or smaller.';
  return '';
}

@Component({
  selector: 'app-reference-library',
  imports: [
    RouterLink,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonTitle,
    IonToolbar,
    LoadingSkeletonComponent,
    PageHeaderComponent,
    StatePanelComponent,
    ProductivityNavComponent,
  ],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar
        ><ion-title>Reference Library</ion-title
        ><ion-button slot="end" fill="clear" aria-label="Refresh Reference Library" (click)="load(true)"
          ><ion-icon name="refresh-outline" slot="icon-only" /></ion-button></ion-toolbar></ion-header
    ><ion-content
      ><main class="page-wrap productivity-page">
        <div class="page-action-row">
          <app-page-header
            title="Reference Library"
            description="Read and import Markdown knowledge pages." /><ion-button (click)="fileInput.click()"
            ><ion-icon name="cloud-upload-outline" slot="start" />Import Markdown</ion-button
          ><input
            #fileInput
            class="visually-hidden-file"
            type="file"
            accept=".md,.markdown,text/markdown"
            [attr.aria-describedby]="fileError() ? 'reference-file-error' : null"
            (change)="selectFile($event)" />
        </div>
        <app-productivity-nav />
        <label class="loaded-search productivity-search"
          >Search loaded titles<input type="search" [value]="search()" (input)="searchChanged($event)"
        /></label>
        @if (file(); as selected) {
          <section class="import-panel" aria-live="polite">
            <div>
              <strong>{{ selected.name }}</strong
              ><span>{{ fileSize(selected.size) }}</span>
            </div>
            <span
              ><ion-button fill="clear" [disabled]="importing()" (click)="clearFile()">Cancel</ion-button
              ><ion-button [disabled]="importing()" (click)="upload()">{{
                importStatus() || 'Upload'
              }}</ion-button></span
            >
          </section>
        }
        @if (fileError()) {
          <p id="reference-file-error" class="form-error" role="alert">{{ fileError() }}</p>
        }
        @if (loading()) {
          <app-loading-skeleton />
        } @else if (error()) {
          <app-state-panel [error]="error()" (retry)="load(true)" />
        } @else if (!visible().length) {
          <app-state-panel
            title="No reference pages yet"
            message="Import Markdown or adjust the loaded-title search." />
        } @else {
          <section class="reference-list" aria-label="Reference Library">
            @for (item of visible(); track item.id) {
              <a class="reference-row" [routerLink]="['/app/productivity/reference-library', item.id]"
                ><strong>{{ item.title || 'Untitled reference' }}</strong
                ><span>Last edited {{ formatDateTime(item.lastEditedTime) }}</span></a
              >
            }
          </section>
        }
        @if (hasMore() && !search()) {
          <ion-button class="load-more" fill="outline" [disabled]="loadingMore()" (click)="load(false, true)">{{
            loadingMore() ? 'Loading…' : 'Load more'
          }}</ion-button>
        }
      </main></ion-content
    >`,
})
export class ReferenceLibraryPage {
  private readonly api = inject(ProductivityService);
  private readonly snackbar = inject(SnackbarService);
  private readonly destroyRef = inject(DestroyRef);
  private pollController?: AbortController;
  readonly items = signal<ReferenceLibraryItem[]>([]);
  readonly visible = signal<ReferenceLibraryItem[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly error = signal('');
  readonly hasMore = signal(false);
  readonly nextCursor = signal<string | null>(null);
  readonly search = signal('');
  readonly file = signal<File | null>(null);
  readonly fileError = signal('');
  readonly importing = signal(false);
  readonly importStatus = signal('');
  readonly formatDateTime = formatDateTime;
  constructor() {
    addIcons({ cloudUploadOutline, refreshOutline });
    this.destroyRef.onDestroy(() => this.pollController?.abort());
    this.load();
  }
  load(refresh = false, more = false): void {
    if (this.loadingMore()) return;
    this.loading.set(!more);
    this.loadingMore.set(more);
    this.error.set('');
    this.api
      .referenceList(refresh, more ? (this.nextCursor() ?? undefined) : undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          const data = more
            ? [...new Map([...this.items(), ...page.data].map(item => [item.id, item])).values()]
            : page.data;
          this.items.set(data);
          this.applySearch();
          this.hasMore.set(page.hasMore);
          this.nextCursor.set(page.nextCursor);
          this.loading.set(false);
          this.loadingMore.set(false);
        },
        error: error => {
          this.error.set(apiError(error));
          this.loading.set(false);
          this.loadingMore.set(false);
        },
      });
  }
  searchChanged(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.search.set(event.target.value);
      this.applySearch();
    }
  }
  selectFile(event: Event): void {
    const input = event.target;
    if (!(input instanceof HTMLInputElement)) return;
    const file = input.files?.[0] ?? null;
    const error = validateMarkdownFile(file);
    this.fileError.set(error);
    this.file.set(error ? null : file);
    input.value = '';
  }
  clearFile(): void {
    this.file.set(null);
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
      const response = await firstValueFrom(this.api.importMarkdown(file));
      const body = response.body;
      if (!body) throw new Error('The import returned no result.');
      if ('taskId' in body) {
        this.importStatus.set('Processing in Notion…');
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
  private progressLabel(status: 'queued' | 'running' | 'retrying' | 'succeeded' | 'failed'): string {
    if (status === 'queued') return 'Queued in Notion…';
    if (status === 'running') return 'Processing in Notion…';
    if (status === 'retrying') return 'Retrying import…';
    if (status === 'succeeded') return 'Import complete';
    return 'Import failed';
  }
  private applySearch(): void {
    const q = this.search().trim().toLowerCase();
    this.visible.set(q ? this.items().filter(item => item.title.toLowerCase().includes(q)) : this.items());
  }
}
