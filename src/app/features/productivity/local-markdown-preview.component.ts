import { Component, input, output, signal } from '@angular/core';
import { IonButton, IonContent, IonHeader, IonModal, IonTitle, IonToolbar } from '@ionic/angular';
import { MarkdownViewerComponent } from './markdown-viewer.component';

@Component({
  selector: 'app-local-markdown-preview',
  imports: [IonButton, IonContent, IonHeader, IonModal, IonTitle, IonToolbar, MarkdownViewerComponent],
  template: `<ion-modal class="local-markdown-preview-modal" [isOpen]="true" (didDismiss)="close()">
    <ng-template>
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title>{{ filename() }}</ion-title>
          <ion-button slot="end" fill="clear" (click)="close()">Close</ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <main class="local-markdown-preview">
          <p class="local-preview-notice">Local preview · This file is not uploaded</p>
          <div class="source-toggle" role="group" aria-label="Local Markdown view">
            <button type="button" [class.active]="!source()" (click)="source.set(false)">Preview</button>
            <button type="button" [class.active]="source()" (click)="source.set(true)">Source</button>
          </div>
          <article class="markdown-panel">
            @if (source()) {
              <pre class="markdown-source"><code>{{ markdown() }}</code></pre>
            } @else {
              <app-markdown-viewer [markdown]="markdown()" />
            }
          </article>
        </main>
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class LocalMarkdownPreviewComponent {
  readonly filename = input.required<string>();
  readonly markdown = input.required<string>();
  readonly dismissed = output<void>();
  readonly source = signal(false);

  close(): void {
    this.dismissed.emit();
  }
}
