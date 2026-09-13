import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { IonButton, IonContent, IonHeader, IonIcon, IonTitle, IonToolbar } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { arrowBackOutline, refreshOutline } from 'ionicons/icons';
import { Observable } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { LoadingSkeletonComponent } from '../../shared/components/loading-skeleton.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { MemoDetail, ReferenceLibraryDetail } from '../../shared/models/api.models';
import { formatDateTime } from '../../shared/utils/format';
import { MarkdownViewerComponent } from './markdown-viewer.component';
import { ProductivityNavComponent } from './productivity-nav.component';
import { ProductivityService } from './productivity.service';

@Component({
  selector: 'app-markdown-detail',
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
    MarkdownViewerComponent,
    ProductivityNavComponent,
  ],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar
        ><ion-title>{{ kind === 'memos' ? 'Memo' : 'Reference Library' }}</ion-title
        ><ion-button slot="end" fill="clear" aria-label="Refresh content" (click)="load(true)"
          ><ion-icon name="refresh-outline" slot="icon-only" /></ion-button></ion-toolbar></ion-header
    ><ion-content
      ><main class="page-wrap productivity-page">
        <app-productivity-nav />
        <a
          class="back-link"
          [routerLink]="kind === 'memos' ? '/app/productivity/memos' : '/app/productivity/reference-library'"
          ><ion-icon name="arrow-back-outline" />Back</a
        >
        @if (loading()) {
          <app-loading-skeleton />
        } @else if (error()) {
          <app-state-panel [error]="error()" (retry)="load(true)" />
        } @else if (detail(); as item) {
          <header class="markdown-heading">
            <div>
              <p class="eyebrow">{{ kind === 'memos' ? 'Memo' : 'Reference Library' }}</p>
              <h1>{{ title(item) }}</h1>
              <p>Last edited {{ formatDateTime(item.lastEditedTime) }}</p>
            </div>
            <div class="source-toggle" role="group" aria-label="Content view">
              <button type="button" [class.active]="!source()" (click)="source.set(false)">Preview</button
              ><button type="button" [class.active]="source()" (click)="source.set(true)">Source</button>
            </div>
          </header>
          @if (item.truncated) {
            <p class="content-warning" role="status">Notion returned a truncated Markdown representation.</p>
          }
          @if (item.unknownBlockIds.length) {
            <p class="content-warning" role="status">Some Notion blocks could not be represented in Markdown.</p>
          }
          <article class="markdown-panel">
            @if (source()) {
              <pre class="markdown-source"><code>{{ item.markdown || item.textFallback }}</code></pre>
            } @else {
              <app-markdown-viewer [markdown]="item.markdown || item.textFallback" />
            }
          </article>
        }</main
    ></ion-content>`,
})
export class MarkdownDetailPage {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ProductivityService);
  private readonly destroyRef = inject(DestroyRef);
  readonly kind = this.route.snapshot.data['kind'] as 'memos' | 'reference-library';
  readonly detail = signal<MemoDetail | ReferenceLibraryDetail | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly source = signal(false);
  readonly formatDateTime = formatDateTime;
  constructor() {
    addIcons({ arrowBackOutline, refreshOutline });
    this.load();
  }
  load(refresh = false): void {
    const id = this.route.snapshot.paramMap.get('pageId');
    if (!id) {
      this.error.set('This page could not be found.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.error.set('');
    const request: Observable<MemoDetail | ReferenceLibraryDetail> =
      this.kind === 'memos' ? this.api.detailMemo(id, refresh) : this.api.referenceDetail(id, refresh);
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: item => {
        this.detail.set(item);
        this.loading.set(false);
      },
      error: error => {
        this.error.set(apiError(error));
        this.loading.set(false);
      },
    });
  }
  title(item: MemoDetail | ReferenceLibraryDetail): string {
    return 'memo' in item ? item.memo : item.title;
  }
}
