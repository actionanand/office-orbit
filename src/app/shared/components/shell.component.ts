import { Component, inject } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import {
  gridOutline,
  journalOutline,
  checkboxOutline,
  repeatOutline,
  rocketOutline,
  chatbubblesOutline,
  linkOutline,
  settingsOutline,
  ellipsisHorizontalOutline,
} from 'ionicons/icons';
import { navigation } from '../navigation';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthState } from '../../core/auth/auth-state';
@Component({
  selector: 'app-shell',
  imports: [NgOptimizedImage, RouterLink, RouterLinkActive, RouterOutlet, IonIcon],
  template: `@if (auth.authenticated() && !lock.locked()) {
      <a class="skip-link" href="#workspace">Skip to content</a>
      <div class="workspace-shell">
        <aside class="sidebar">
          <a class="brand-row" routerLink="/app/dashboard"
            ><img ngSrc="assets/office-orbit.png" width="52" height="52" alt="" /><span
              >Office Orbit<small>Your personal workspace</small></span
            ></a
          >
          <p class="nav-label">Workspace</p>
          <nav aria-label="Workspace navigation">
            @for (item of nav; track item.path) {
              <a [routerLink]="'/app/' + item.path" routerLinkActive="active" ariaCurrentWhenActive="page"
                ><ion-icon [name]="item.icon" aria-hidden="true" />{{ item.label }}</a
              >
            }
          </nav>
          <div class="sidebar-note">A little clarity. Every day.</div>
        </aside>
        <div id="workspace" class="workspace-content" tabindex="-1"><router-outlet /></div>
        <nav class="bottom-nav" aria-label="Mobile navigation">
          @for (item of mobile; track item.path) {
            <a [routerLink]="'/app/' + item.path" routerLinkActive="active" ariaCurrentWhenActive="page"
              ><ion-icon [name]="item.icon" aria-hidden="true" /><span>{{ item.label }}</span></a
            >
          }
        </nav>
      </div>
    } @else {
      <div class="session-shield" role="status">
        {{ lock.locked() ? 'Office Orbit is locked.' : 'Your session has ended.'
        }}<a [routerLink]="auth.authenticated() ? '/unlock' : '/login'">Continue</a>
      </div>
    }`,
})
export class ShellComponent {
  readonly nav = navigation;
  readonly mobile = [...navigation.slice(0, 4), { path: 'more', label: 'More', icon: 'ellipsis-horizontal-outline' }];
  readonly lock = inject(AppLockService);
  readonly auth = inject(AuthState);
  constructor() {
    addIcons({
      gridOutline,
      journalOutline,
      checkboxOutline,
      repeatOutline,
      rocketOutline,
      chatbubblesOutline,
      linkOutline,
      settingsOutline,
      ellipsisHorizontalOutline,
    });
  }
}
