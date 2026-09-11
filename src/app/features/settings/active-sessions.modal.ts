import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AlertController,
  IonBadge,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { addIcons } from 'ionicons';
import { closeOutline, desktopOutline, globeOutline, phonePortraitOutline } from 'ionicons/icons';
import { firstValueFrom, Subscription } from 'rxjs';
import { apiError } from '../../core/api/api-error';
import { AuthService } from '../../core/auth/auth.service';
import { ActiveSession, SessionManagementService } from '../../core/auth/session-management.service';

@Component({
  selector: 'app-active-sessions-modal',
  imports: [IonBadge, IonButton, IonContent, IonHeader, IonIcon, IonModal, IonSpinner, IonTitle, IonToolbar],
  template: `<ion-modal
    class="active-sessions-modal"
    [isOpen]="true"
    [canDismiss]="revokingSessionIds().length === 0 && !loggingOutOthers()"
    (didDismiss)="close()">
    <ng-template>
      <ion-header class="ion-no-border">
        <ion-toolbar>
          <ion-title id="active-sessions-title">Active sessions</ion-title>
          <ion-button
            slot="end"
            fill="clear"
            aria-label="Close active sessions"
            [disabled]="revokingSessionIds().length > 0 || loggingOutOthers()"
            (click)="close()">
            <ion-icon name="close-outline" slot="icon-only" aria-hidden="true" />
          </ion-button>
        </ion-toolbar>
      </ion-header>
      <ion-content [attr.aria-labelledby]="'active-sessions-title'">
        <div class="active-sessions-content">
          <div class="active-sessions-intro">
            <p>Devices and browsers currently signed in to Office Orbit.</p>
            @if (hasOtherSessions()) {
              <ion-button
                fill="outline"
                size="small"
                [attr.aria-label]="loggingOutOthers() ? 'Logging out all other devices' : null"
                [disabled]="loggingOutOthers()"
                (click)="logoutOthers()">
                @if (loggingOutOthers()) {
                  <ion-spinner name="crescent" />
                } @else {
                  Log out from all other devices
                }
              </ion-button>
            }
          </div>

          @if (message()) {
            <p class="message" role="status" aria-live="polite">{{ message() }}</p>
          }
          @if (actionError()) {
            <p class="message error" role="alert">{{ actionError() }}</p>
          }
          @if (loading()) {
            <div class="active-sessions-state" role="status" aria-live="polite">
              <ion-spinner name="crescent" /><span>Loading active sessions…</span>
            </div>
          } @else if (error()) {
            <div class="active-sessions-state">
              <p role="alert">{{ error() }}</p>
              <ion-button fill="outline" (click)="load()">Retry</ion-button>
            </div>
          } @else if (orderedSessions().length === 0) {
            <div class="active-sessions-state" role="status">No active sessions were found.</div>
          } @else {
            <div class="active-session-list" role="list">
              @for (session of orderedSessions(); track session.id) {
                <article class="active-session-row" role="listitem">
                  <div class="active-session-icon" aria-hidden="true">
                    <ion-icon [name]="sessionIcon(session.device.platform)" />
                  </div>
                  <div class="active-session-details">
                    <div class="active-session-heading">
                      <h2>{{ deviceName(session) }}</h2>
                      @if (session.current) {
                        <ion-badge color="primary">Current device</ion-badge>
                      }
                    </div>
                    <p>{{ deviceSummary(session) }}</p>
                    @if (countryName(session.country); as country) {
                      <p>{{ country }}</p>
                    }
                    <p [attr.title]="absoluteTime(session.lastSeenAt)">
                      Last active: {{ relativeTime(session.lastSeenAt) }}
                    </p>
                    <p class="active-session-created" [attr.title]="absoluteTime(session.createdAt)">
                      Signed in: {{ absoluteTime(session.createdAt) }}
                    </p>
                  </div>
                  <ion-button
                    class="active-session-logout"
                    fill="outline"
                    size="small"
                    color="danger"
                    [attr.aria-label]="'Log out ' + deviceName(session)"
                    [disabled]="isRevoking(session.id) || loggingOutOthers()"
                    (click)="logoutSession(session)">
                    @if (isRevoking(session.id)) {
                      <ion-spinner name="crescent" />
                    } @else {
                      Log out
                    }
                  </ion-button>
                </article>
              }
            </div>
          }
        </div>
      </ion-content>
    </ng-template>
  </ion-modal>`,
})
export class ActiveSessionsModalComponent {
  private readonly sessionManagement = inject(SessionManagementService);
  private readonly auth = inject(AuthService);
  private readonly alerts = inject(AlertController);
  private readonly destroyRef = inject(DestroyRef);
  readonly closed = output<void>();
  readonly timeFormat = input<'12' | '24'>('12');
  readonly sessions = signal<ActiveSession[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly actionError = signal('');
  readonly revokingSessionIds = signal<string[]>([]);
  readonly loggingOutOthers = signal(false);
  readonly message = signal('');
  readonly orderedSessions = computed(() =>
    [...this.sessions()].sort((left, right) => Number(right.current) - Number(left.current)),
  );
  readonly otherSessions = computed(() => this.sessions().filter(session => !session.current));
  readonly hasOtherSessions = computed(() => this.otherSessions().length > 0);
  private listRequest?: Subscription;
  private closeEmitted = false;

  constructor() {
    addIcons({ closeOutline, desktopOutline, globeOutline, phonePortraitOutline });
    this.load();
  }

  load(): void {
    this.listRequest?.unsubscribe();
    this.loading.set(true);
    this.error.set('');
    this.actionError.set('');
    this.message.set('');
    this.listRequest = this.sessionManagement
      .listActiveSessions()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: response => {
          this.sessions.set(Array.isArray(response.sessions) ? response.sessions : []);
          this.loading.set(false);
        },
        error: error => {
          this.loading.set(false);
          this.error.set(apiError(error));
        },
      });
  }

  close(): void {
    this.listRequest?.unsubscribe();
    if (this.closeEmitted) return;
    this.closeEmitted = true;
    this.closed.emit();
  }

  async logoutSession(session: ActiveSession): Promise<void> {
    if (this.isRevoking(session.id) || !(await this.confirmSessionLogout(session))) return;
    this.revokingSessionIds.update(ids => [...ids, session.id]);
    this.error.set('');
    this.actionError.set('');
    this.message.set('');
    try {
      const response = await firstValueFrom(this.sessionManagement.revokeSession(session.id));
      if (response.currentSession) {
        this.close();
        await this.auth.signOut();
        return;
      }
      this.sessions.update(sessions => sessions.filter(item => item.id !== session.id));
      this.message.set(`${this.deviceName(session)} was logged out.`);
    } catch (error) {
      this.actionError.set(apiError(error));
    } finally {
      this.revokingSessionIds.update(ids => ids.filter(id => id !== session.id));
    }
  }

  async logoutOthers(): Promise<void> {
    if (this.loggingOutOthers() || !(await this.confirmLogoutOthers())) return;
    this.loggingOutOthers.set(true);
    this.error.set('');
    this.actionError.set('');
    this.message.set('');
    try {
      const response = await firstValueFrom(this.sessionManagement.revokeOtherSessions());
      this.sessions.update(sessions => sessions.filter(session => session.current));
      const count = response.revokedCount;
      this.message.set(`${count} other session${count === 1 ? '' : 's'} logged out.`);
    } catch (error) {
      this.actionError.set(apiError(error));
    } finally {
      this.loggingOutOthers.set(false);
    }
  }

  isRevoking(sessionId: string): boolean {
    return this.revokingSessionIds().includes(sessionId);
  }

  deviceName(session: ActiveSession): string {
    const provided = session.device.name?.trim();
    if (provided) return provided;
    switch (this.normalizedPlatform(session.device.platform)) {
      case 'android':
        return 'Android device';
      case 'web':
        return 'Web browser';
      case 'ios':
        return 'iOS device';
      case 'desktop':
        return 'Desktop';
      default:
        return 'Unknown device';
    }
  }

  deviceSummary(session: ActiveSession): string {
    const details = [this.platformLabel(session.device.platform)];
    if (session.device.model && !this.deviceName(session).includes(session.device.model))
      details.push(session.device.model);
    if (session.device.appVersion) details.push(`App ${session.device.appVersion}`);
    return details.join(' • ');
  }

  sessionIcon(platform: string): string {
    switch (this.normalizedPlatform(platform)) {
      case 'web':
        return 'globe-outline';
      case 'desktop':
        return 'desktop-outline';
      default:
        return 'phone-portrait-outline';
    }
  }

  relativeTime(value: string): string {
    const time = Date.parse(value);
    if (!Number.isFinite(time)) return 'Unknown';
    const elapsed = Math.max(0, Date.now() - time);
    const minutes = Math.floor(elapsed / 60_000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
    if (hours < 48) return 'Yesterday';
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  }

  absoluteTime(value: string): string {
    const time = Date.parse(value);
    if (!Number.isFinite(time)) return 'Unknown';
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: this.timeFormat() === '12',
    }).format(time);
  }

  countryName(country: string | null): string {
    if (!country) return '';
    const code = country.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(code)) return country;
    try {
      return new Intl.DisplayNames(undefined, { type: 'region' }).of(code) ?? code;
    } catch {
      return code;
    }
  }

  private platformLabel(platform: string): string {
    switch (this.normalizedPlatform(platform)) {
      case 'android':
        return 'Android';
      case 'web':
        return 'Web';
      case 'ios':
        return 'iOS';
      case 'desktop':
        return 'Desktop';
      default:
        return 'Unknown';
    }
  }

  private normalizedPlatform(platform: string): string {
    return platform?.trim().toLowerCase() || 'unknown';
  }

  private async confirmSessionLogout(session: ActiveSession): Promise<boolean> {
    const alert = await this.alerts.create({
      header: session.current ? 'Log out this device?' : `Log out ${this.deviceName(session)}?`,
      message: session.current
        ? 'You will need to sign in again on this device.'
        : 'That device or browser will need to sign in again.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Log out', role: 'confirm' },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }

  private async confirmLogoutOthers(): Promise<boolean> {
    const alert = await this.alerts.create({
      header: 'Log out all other devices?',
      message: 'Your current device will stay signed in.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Log out', role: 'confirm' },
      ],
    });
    await alert.present();
    return (await alert.onDidDismiss()).role === 'confirm';
  }
}
