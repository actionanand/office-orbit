import { Component, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular';
import { ApiItem, displayValue, humanize, itemTitle } from '../models/api.models';
import { ValueComponent } from './value.component';
import { LinksService, safeUrl } from '../../core/platform/links.service';
@Component({
  selector: 'app-data-card',
  imports: [RouterLink, IonButton, ValueComponent],
  template: `<article class="data-card">
    <h2>{{ title() }}</h2>
    <dl>
      @for (entry of preview(); track entry[0]) {
        <div>
          <dt>{{ label(entry[0]) }}</dt>
          <dd>{{ text(entry[1]) }}</dd>
        </div>
      }
    </dl>
    <details>
      <summary>All details</summary>
      <app-value [value]="item()" />
    </details>
    <div class="card-actions">
      @if (jiraKey(); as key) {
        <a [routerLink]="['/app/jiras', key]">View JIRA →</a>
      }
      @if (url(); as link) {
        <ion-button fill="clear" (click)="open(link)">Open link ↗</ion-button>
      }
    </div>
    @if (error()) {
      <p role="alert">{{ error() }}</p>
    }
  </article>`,
})
export class DataCardComponent {
  readonly item = input.required<ApiItem>();
  readonly jira = input(false);
  private readonly links = inject(LinksService);
  readonly error = signal('');
  readonly title = computed(() => itemTitle(this.item()));
  readonly preview = computed(() =>
    Object.entries(this.item())
      .filter(
        ([key, value]) => !['title', 'name', 'summary', 'id', 'url'].includes(key) && value !== null && value !== '',
      )
      .slice(0, 8),
  );
  readonly jiraKey = computed(() => {
    if (!this.jira()) return null;
    const key = this.item()['jiraKey'] ?? this.item()['key'];
    return typeof key === 'string' ? key : null;
  });
  readonly url = computed(() => safeUrl(this.item()['url'] ?? this.item()['link']));
  readonly label = humanize;
  readonly text = displayValue;
  async open(url: string) {
    try {
      await this.links.open(url);
    } catch {
      this.error.set('Unable to open this link. Try again.');
    }
  }
}
