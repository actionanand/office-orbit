import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { JiraService } from './jiras.service';
import { ApiItem, itemTitle } from '../../shared/models/api.models';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { ValueComponent } from '../../shared/components/value.component';
import { apiError } from '../../core/api/api-error';
@Component({
  selector: 'app-jira-detail',
  imports: [RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, StatePanelComponent, ValueComponent],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar><ion-title>JIRA detail</ion-title></ion-toolbar></ion-header
    ><ion-content
      ><main class="page-wrap">
        <a routerLink="/app/jiras">← Back to JIRAs</a>
        <header class="page-heading">
          <p class="eyebrow">{{ jiraKey() }}</p>
          <h1>{{ item() ? title(item()!) : 'JIRA detail' }}</h1>
        </header>
        @if (loading() || error()) {
          <app-state-panel [loading]="loading()" [error]="error()" (retry)="load()" />
        } @else {
          <section class="data-card"><app-value [value]="item()" /></section>
        }</main
    ></ion-content>`,
})
export class JiraDetailPage {
  readonly jiraKey = input.required<string>();
  readonly item = signal<ApiItem | null>(null);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly title = itemTitle;
  private readonly service = inject(JiraService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  constructor() {
    effect(() => {
      this.jiraKey();
      this.load();
    });
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.service
      .detail(this.jiraKey())
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
}
