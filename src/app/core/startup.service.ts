import { inject, Service, signal } from '@angular/core';
import { Router } from '@angular/router';
import { App } from '@capacitor/app';
import { AuthService } from './auth/auth.service';
import { AppLockService } from './app-lock/app-lock.service';
import { PlatformService } from './platform/platform.service';
import { BiometricService } from './platform/biometric.service';
import { ThemeService } from './theme/theme.service';

@Service()
export class StartupService {
  private readonly auth = inject(AuthService);
  private readonly lock = inject(AppLockService);
  private readonly platform = inject(PlatformService);
  private readonly biometric = inject(BiometricService);
  private readonly router = inject(Router);
  private readonly theme = inject(ThemeService);
  readonly phase = signal<'loading' | 'ready' | 'error'>('loading');
  private initialized?: Promise<void>;
  private listening = false;
  private activityTrackingInstalled = false;
  private attempt = 0;
  start(): Promise<void> {
    return (this.initialized ??= this.initialize());
  }
  async retry(): Promise<void> {
    this.initialized = undefined;
    await this.start();
  }
  private async initialize(): Promise<void> {
    const attempt = ++this.attempt;
    this.phase.set('loading');
    try {
      await this.withDeadline(
        (async () => {
          if (!this.activityTrackingInstalled) {
            this.auth.installActivityTracking();
            this.activityTrackingInstalled = true;
          }
          await this.auth.restore();
          await this.lock.initialize();
          if (this.platform.android && !this.listening) {
            this.listening = true;
            void App.addListener('appStateChange', ({ isActive }) => {
              if (this.biometric.prompting()) return;
              if (isActive) {
                this.auth.setForeground(true);
                if (!this.auth.state.valid()) {
                  void this.auth.signOut();
                  return;
                }
                if (this.lock.locked()) {
                  void this.router.navigateByUrl('/unlock', { replaceUrl: true });
                } else {
                  void this.auth.evaluateRenewal();
                }
              } else {
                this.auth.setForeground(false);
                this.lock.lock();
              }
            }).catch(() => {
              this.listening = false;
            });
          }
        })(),
        20_000,
      );
      if (attempt === this.attempt) this.phase.set('ready');
    } catch {
      if (attempt === this.attempt) {
        this.auth.state.verified.set(false);
        this.phase.set('error');
      }
    }
  }
  private async withDeadline<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        operation,
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error('Startup timed out')), milliseconds);
        }),
      ]);
    } finally {
      clearTimeout(timer);
    }
  }
}
