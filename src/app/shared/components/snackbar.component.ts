import { Component, inject } from '@angular/core';
import { IonButton, IonIcon } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, checkmarkCircleOutline, closeOutline, informationCircleOutline } from 'ionicons/icons';
import { SnackbarService, SnackbarTone } from '../../core/notifications/snackbar.service';

@Component({
  selector: 'app-snackbar',
  imports: [IonButton, IonIcon],
  template: `@if (snackbar.current(); as message) {
    <div
      class="app-snackbar"
      [class.error]="message.tone === 'error'"
      [attr.role]="message.tone === 'error' ? 'alert' : 'status'"
      [attr.aria-live]="message.tone === 'error' ? 'assertive' : 'polite'"
      aria-atomic="true">
      <ion-icon [name]="icon(message.tone)" aria-hidden="true" />
      <span>{{ message.text }}</span>
      <ion-button fill="clear" size="small" aria-label="Dismiss notification" (click)="snackbar.dismiss(message.id)">
        <ion-icon name="close-outline" slot="icon-only" aria-hidden="true" />
      </ion-button>
    </div>
  }`,
  styles: `
    :host {
      position: fixed;
      right: max(20px, env(safe-area-inset-right, 0px));
      bottom: max(20px, env(safe-area-inset-bottom, 0px));
      z-index: 10001;
      width: min(420px, calc(100vw - 40px));
      pointer-events: none;
    }
    .app-snackbar {
      display: grid;
      grid-template-columns: auto minmax(0, 1fr) auto;
      align-items: center;
      gap: 12px;
      min-height: 56px;
      padding: 8px 8px 8px 16px;
      border-radius: 14px;
      color: #fff;
      background: #12382b;
      box-shadow: 0 12px 32px rgb(0 0 0 / 28%);
      pointer-events: auto;
      animation: snackbar-in 160ms ease-out;
    }
    .app-snackbar.error {
      background: #8f2424;
    }
    .app-snackbar > ion-icon {
      font-size: 22px;
      flex-shrink: 0;
    }
    .app-snackbar span {
      font-size: 0.92rem;
      font-weight: 600;
      line-height: 1.35;
    }
    .app-snackbar ion-button {
      --color: #fff;
      --padding-start: 8px;
      --padding-end: 8px;
      min-width: 44px;
      margin: 0;
    }
    @keyframes snackbar-in {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
    }
    @media (max-width: 760px) {
      :host {
        right: max(12px, env(safe-area-inset-right, 0px));
        bottom: calc(80px + env(safe-area-inset-bottom, 0px));
        left: max(12px, env(safe-area-inset-left, 0px));
        width: auto;
      }
      .app-snackbar {
        border-radius: 12px;
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .app-snackbar {
        animation: none;
      }
    }
  `,
})
export class SnackbarComponent {
  readonly snackbar = inject(SnackbarService);

  constructor() {
    addIcons({ alertCircleOutline, checkmarkCircleOutline, closeOutline, informationCircleOutline });
  }

  icon(tone: SnackbarTone): string {
    switch (tone) {
      case 'success':
        return 'checkmark-circle-outline';
      case 'error':
        return 'alert-circle-outline';
      default:
        return 'information-circle-outline';
    }
  }
}
