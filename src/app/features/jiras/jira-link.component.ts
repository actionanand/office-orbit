import { Component, DestroyRef, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { openOutline } from 'ionicons/icons';
import { LinksService } from '../../core/platform/links.service';
import { JiraLinkService } from './jira-link.service';

@Component({
  selector: 'app-jira-link',
  imports: [RouterLink, IonButton, IonIcon],
  template: `<span class="jira-link">
    <a [routerLink]="['/app/jiras', jiraKey()]">{{ jiraKey() }}</a>
    @if (showExternal() && externalUrl(); as url) {
      <ion-button fill="clear" size="small" [attr.aria-label]="'Open ' + jiraKey() + ' in Jira'" (click)="open(url)">
        @if (externalText()) {
          <span>Open in Jira</span>
          <ion-icon slot="end" name="open-outline" aria-hidden="true" />
        } @else {
          <ion-icon slot="icon-only" name="open-outline" aria-hidden="true" />
        }
      </ion-button>
    }
  </span>`,
})
export class JiraLinkComponent {
  readonly jiraKey = input.required<string>();
  readonly showExternal = input(false);
  readonly externalText = input(false);
  readonly externalUrl = signal<string | null>(null);
  private readonly jiraLinks = inject(JiraLinkService);
  private readonly links = inject(LinksService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    addIcons({ openOutline });
    effect(() => {
      const key = this.jiraKey();
      if (!this.showExternal()) {
        this.externalUrl.set(null);
        return;
      }
      this.jiraLinks
        .externalUrl(key)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(url => this.externalUrl.set(url));
    });
  }

  async open(url: string): Promise<void> {
    await this.links.open(url);
  }
}
