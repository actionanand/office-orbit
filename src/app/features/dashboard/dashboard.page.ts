import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subscription } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonTitle, IonToolbar } from '@ionic/angular';
import { DashboardService } from './dashboard.service';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { ValueComponent } from '../../shared/components/value.component';
import { DataCardComponent } from '../../shared/components/data-card.component';
import { ApiItem, humanize } from '../../shared/models/api.models';
import { apiError } from '../../core/api/api-error';
interface Section {
  key: string;
  value: unknown;
  items: ApiItem[] | null;
  metric: boolean;
}
@Component({
  selector: 'app-dashboard',
  imports: [
    IonButton,
    IonContent,
    IonHeader,
    IonTitle,
    IonToolbar,
    StatePanelComponent,
    ValueComponent,
    DataCardComponent,
  ],
  template: ` <ion-header class="ion-no-border"
      ><ion-toolbar
        ><ion-title>Dashboard</ion-title
        ><ion-button slot="end" fill="clear" (click)="load()">Refresh</ion-button></ion-toolbar
      ></ion-header
    ><ion-content
      ><main class="page-wrap">
        <section class="hero">
          <div>
            <p class="eyebrow">Your work, in motion</p>
            <h1>Good to see you.</h1>
            <p>Focus on what needs your attention across sprints, JIRAs, releases, and feedback.</p>
          </div>
        </section>
        @if (loading() || error() || !sections().length) {
          <app-state-panel [loading]="loading()" [error]="error()" (retry)="load()" />
        } @else {
          <div class="card-grid">
            @for (section of metrics(); track section.key) {
              <section class="data-card">
                <h2>{{ label(section.key) }}</h2>
                <div class="metric"><app-value [value]="section.value" /></div>
              </section>
            }
          </div>
          @for (section of groups(); track section.key) {
            <section class="dashboard-section">
              <h2 class="section-heading">{{ label(section.key) }}</h2>
              @if (section.items; as items) {
                @if (items.length) {
                  <div class="card-grid">
                    @for (item of items; track $index) {
                      <app-data-card [item]="item" />
                    }
                  </div>
                } @else {
                  <p>No items returned.</p>
                }
              } @else {
                <div class="data-card"><app-value [value]="section.value" /></div>
              }
            </section>
          }
        }</main
    ></ion-content>`,
})
export class DashboardPage {
  private readonly api = inject(DashboardService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly response = signal<ApiItem>({});
  readonly loading = signal(true);
  readonly error = signal('');
  readonly label = humanize;
  readonly sections = computed<Section[]>(() => {
    const root = this.response();
    const data = root['data'];
    const source = data && typeof data === 'object' && !Array.isArray(data) ? data : root;
    return Object.entries(source)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key, value]) => ({
        key,
        value,
        metric: typeof value === 'number',
        items:
          Array.isArray(value) && value.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))
            ? (value as ApiItem[])
            : null,
      }));
  });
  readonly metrics = computed(() => this.sections().filter(section => section.metric));
  readonly groups = computed(() => this.sections().filter(section => !section.metric));
  constructor() {
    this.load();
  }
  load() {
    this.request?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.request = this.api
      .get()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: value => {
          this.response.set(value);
          this.loading.set(false);
        },
        error: error => {
          this.error.set(apiError(error));
          this.loading.set(false);
        },
      });
  }
}
