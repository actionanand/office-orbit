import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { IonButton, IonContent, IonHeader, IonSegment, IonSegmentButton, IonTitle, IonToolbar } from '@ionic/angular';
import { apiError } from '../../core/api/api-error';
import { ReadFeatureService } from '../../core/api/read-feature.service';
import { DataCardComponent } from '../../shared/components/data-card.component';
import { StatePanelComponent } from '../../shared/components/state-panel.component';
import { ApiItem, displayValue } from '../../shared/models/api.models';
@Component({
  selector: 'app-resource',
  imports: [
    ReactiveFormsModule,
    IonButton,
    IonContent,
    IonHeader,
    IonSegment,
    IonSegmentButton,
    IonTitle,
    IonToolbar,
    DataCardComponent,
    StatePanelComponent,
  ],
  template: ` <ion-header class="ion-no-border"
      ><ion-toolbar
        ><ion-title>{{ feature.heading }}</ion-title
        ><ion-button slot="end" fill="clear" (click)="load()">Refresh</ion-button></ion-toolbar
      ></ion-header
    >
    <ion-content
      ><main class="page-wrap">
        <header class="page-heading">
          <p class="eyebrow">Office Orbit</p>
          <h1>{{ feature.heading }}</h1>
          <p>{{ feature.description }}</p>
        </header>
        <ion-segment [value]="selected()" [scrollable]="true" (ionChange)="select($event.detail.value)">
          @for (view of feature.views; track view.path) {
            <ion-segment-button [value]="view.path">{{ view.label }}</ion-segment-button>
          }
        </ion-segment>
        <form class="filters" [formGroup]="filters" (ngSubmit)="load()">
          <label
            >Search loaded items<input
              type="search"
              [value]="search()"
              (input)="searchChanged($event)"
              placeholder="Find in this view"
          /></label>
          @if (feature.kind === 'work-logs') {
            <label>From<input type="date" formControlName="from" /></label
            ><label>To<input type="date" formControlName="to" /></label
            ><ion-button type="submit" fill="outline">Apply dates</ion-button>
          }
        </form>
        @if (loading() || error() || !visible().length) {
          <app-state-panel [loading]="loading()" [error]="error()" (retry)="load()" />
        } @else {
          <p class="result-count">{{ visible().length }} shown · {{ count() }} returned</p>
          <section class="card-grid">
            @for (item of visible(); track $index) {
              <app-data-card [item]="item" [jira]="feature.kind === 'jiras'" />
            }
          </section>
        }
        @if (hasMore()) {
          <p class="message" role="status">
            More records are available on the server. Narrow this view to find specific work.
          </p>
        }
      </main></ion-content
    >`,
})
export class ResourcePage {
  readonly feature = inject(ReadFeatureService);
  private readonly destroyRef = inject(DestroyRef);
  private request?: Subscription;
  readonly selected = signal(this.feature.views[0].path);
  readonly items = signal<ApiItem[]>([]);
  readonly count = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly search = signal('');
  readonly hasMore = signal(false);
  readonly filters = new FormGroup({
    from: new FormControl('', { nonNullable: true }),
    to: new FormControl('', { nonNullable: true }),
  });
  readonly visible = computed(() => {
    const term = this.search().toLowerCase().trim();
    return term
      ? this.items().filter(item => Object.values(item).some(value => displayValue(value).toLowerCase().includes(term)))
      : this.items();
  });
  constructor() {
    this.load();
  }
  searchChanged(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.search.set(event.target.value);
  }
  select(value: string | number | undefined): void {
    if (typeof value === 'string' && value !== this.selected()) {
      this.selected.set(value);
      this.load();
    }
  }
  load(): void {
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
      .list(this.selected(), filters)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.items.set(response.data);
          this.count.set(response.count);
          this.hasMore.set(response.hasMore);
          this.loading.set(false);
        },
        error: error => {
          this.error.set(apiError(error));
          this.loading.set(false);
        },
      });
  }
}
