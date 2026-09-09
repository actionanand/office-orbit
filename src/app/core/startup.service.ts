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
  // Distinguishes a local security/storage failure from a backend/network one so
  // the UI does not report every startup problem as a connection error.
  readonly reason = signal<'network' | 'local' | null>(null);
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
    this.reason.set(null);
    try {
      await this.withDeadline(
        (async () => {
          if (!this.activityTrackingInstalled) {
            this.auth.installActivityTracking();
            this.activityTrackingInstalled = true;
          }
          // Runs the PIN read concurrently with the session read below instead of
          // after it, so a slow native storage layer only costs its own latency once.
          this.lock.prefetch();
          await this.auth.restore();
          await this.lock.initialize();
          if (this.platform.android && !this.listening) {
            this.listening = true;
            void App.addListener('appStateChange', ({ isActive }) => {
              if (this.biometric.prompting()) return;
              if (isActive) {
                this.auth.setForeground(true);
                // Only a previously established session is worth signing out of; a
                // resume while still on the login screen has nothing to clear.
                if (!this.auth.state.valid()) {
                  if (this.auth.state.session()) void this.auth.signOut();
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
      if (attempt !== this.attempt) return;
      // A stored local-protection record that cannot be read over a valid session
      // must not expose data. Reset it and require Worker password reauthentication.
      if (this.lock.recovery()) {
        await this.lock.clearUnreadable();
        this.phase.set('ready');
        await this.auth.signOut('Your saved PIN could not be read. Sign in again to continue.');
        return;
      }
      this.phase.set('ready');
    } catch {
      if (attempt !== this.attempt) return;
      // Fail closed: drop any unverified session so protected content stays hidden.
      // Without a valid session the user must still be able to reach the login
      // screen, so only surface the blocking error when a session is at risk.
      this.auth.state.verified.set(false);
      if (this.auth.state.valid()) {
        this.reason.set('local');
        this.phase.set('error');
      } else {
        this.reason.set('network');
        this.phase.set('ready');
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
