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
  start(): Promise<void> {
    return (this.initialized ??= this.initialize());
  }
  async retry(): Promise<void> {
    this.initialized = undefined;
    await this.start();
  }
  private async initialize(): Promise<void> {
    this.phase.set('loading');
    try {
      await this.lock.initialize();
      await this.auth.restore();
      if (this.platform.android && !this.listening) {
        await App.addListener('appStateChange', ({ isActive }) => {
          if (this.biometric.prompting()) return;
          this.lock.lock();
          if (isActive) {
            if (!this.auth.state.valid()) {
              void this.auth.signOut();
              return;
            }
            if (this.lock.enabled()) void this.router.navigateByUrl('/unlock', { replaceUrl: true });
          }
        });
        this.listening = true;
      }
      this.phase.set('ready');
    } catch {
      this.auth.state.verified.set(false);
      this.phase.set('error');
    }
  }
}
