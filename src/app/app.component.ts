import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IonApp, IonSpinner } from '@ionic/angular';
import { StartupService } from './core/startup.service';
@Component({
  selector: 'app-root',
  imports: [IonApp, RouterOutlet, IonSpinner],
  template: `<ion-app>
    @if (startup.phase() === 'loading') {
      <div class="session-shield" role="status">
        <ion-spinner aria-label="Initializing Office Orbit" /><span>Opening your workspace…</span>
      </div>
    }
    <router-outlet
  /></ion-app>`,
})
export class AppComponent {
  readonly startup = inject(StartupService);
  constructor() {
    inject(Router)
      .events.pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(event => {
        if (event instanceof NavigationEnd)
          requestAnimationFrame(() => {
            const heading = document.querySelector<HTMLElement>('h1');
            if (heading) {
              heading.tabIndex = -1;
              heading.focus({ preventScroll: true });
            }
          });
      });
    void this.startup.start();
  }
}
