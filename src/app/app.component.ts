import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonApp, IonButton, IonSpinner } from '@ionic/angular';
import { StartupService } from './core/startup.service';
import { AuthService } from './core/auth/auth.service';
@Component({
  selector: 'app-root',
  imports: [IonApp, IonButton, RouterOutlet, IonSpinner],
  template: `<ion-app>
    @if (startup.phase() === 'loading') {
      <div class="session-shield" role="status">
        <ion-spinner aria-label="Initializing Office Orbit" /><span>Qurio is preparing your work orbit…</span>
      </div>
    } @else if (startup.phase() === 'error') {
      <div class="session-shield" role="alert">
        <strong>Office Orbit could not finish starting.</strong>
        <span>Check your connection, then try again.</span>
        <ion-button fill="outline" (click)="retryStartup()">Try again</ion-button>
      </div>
    }
    <router-outlet
  /></ion-app>`,
})
export class AppComponent {
  readonly startup = inject(StartupService);
  constructor() {
    const auth = inject(AuthService);
    inject(Router)
      .events.pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(event => {
        if (event instanceof NavigationEnd) {
          auth.recordActivity();
          requestAnimationFrame(() => {
            const heading = document.querySelector<HTMLElement>('h1');
            if (heading) {
              heading.tabIndex = -1;
              heading.focus({ preventScroll: true });
            }
          });
        }
      });
    void this.startup.start();
  }
  async retryStartup(): Promise<void> {
    await this.startup.retry();
  }
}
