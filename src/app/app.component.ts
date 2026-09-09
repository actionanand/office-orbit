import { Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgOptimizedImage } from '@angular/common';
import { IonApp, IonButton, IonSpinner } from '@ionic/angular';
import { StartupService } from './core/startup.service';
import { AuthService } from './core/auth/auth.service';
@Component({
  selector: 'app-root',
  imports: [IonApp, IonButton, NgOptimizedImage, RouterOutlet, IonSpinner],
  template: `<ion-app>
    @if (startup.phase() === 'loading') {
      <div class="session-shield" role="status">
        <img ngSrc="assets/office-orbit.png" width="96" height="96" priority alt="" />
        <ion-spinner aria-label="Initializing Office Orbit" /><span>Office Orbit is getting ready…</span>
      </div>
    } @else if (startup.phase() === 'error') {
      <div class="session-shield" role="alert">
        <strong>Office Orbit could not finish starting.</strong>
        @if (startup.reason() === 'local') {
          <span>We couldn’t load your saved security settings. Sign in again to continue.</span>
        } @else {
          <span>Check your connection, then try again.</span>
        }
        <ion-button fill="outline" (click)="retryStartup()">Try again</ion-button>
        <ion-button fill="clear" (click)="goToSignIn()">Go to sign in</ion-button>
      </div>
    }
    <router-outlet
  /></ion-app>`,
})
export class AppComponent {
  readonly startup = inject(StartupService);
  private readonly router = inject(Router);
  constructor() {
    const auth = inject(AuthService);
    this.router.events.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe(event => {
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
  async goToSignIn(): Promise<void> {
    this.startup.phase.set('ready');
    await this.router.navigateByUrl('/login', { replaceUrl: true });
  }
}
