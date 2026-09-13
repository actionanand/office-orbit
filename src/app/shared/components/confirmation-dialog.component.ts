import { Component, inject } from '@angular/core';
import { IonButton, IonIcon, IonModal } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, closeOutline, trashOutline } from 'ionicons/icons';
import { ConfirmationService } from '../../core/notifications/confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  imports: [IonButton, IonIcon, IonModal],
  template: `@if (confirmation.current(); as request) {
    <ion-modal class="confirmation-modal" [isOpen]="true" [backdropDismiss]="true" (didDismiss)="dismiss(request.id)">
      <ng-template>
        <section
          class="confirmation-card"
          role="alertdialog"
          aria-modal="true"
          [attr.aria-labelledby]="'confirm-title-' + request.id"
          [attr.aria-describedby]="'confirm-message-' + request.id">
          <div class="confirmation-icon" [class.danger]="request.danger">
            <ion-icon [name]="request.danger ? 'trash-outline' : 'alert-circle-outline'" aria-hidden="true" />
          </div>
          <div class="confirmation-heading">
            <h2 [id]="'confirm-title-' + request.id">{{ request.title }}</h2>
            <ion-button fill="clear" aria-label="{{ request.cancelLabel }}" (click)="confirmation.settle(false)">
              <ion-icon name="close-outline" slot="icon-only" aria-hidden="true" />
            </ion-button>
          </div>
          <p [id]="'confirm-message-' + request.id">{{ request.message }}</p>
          <div class="confirmation-actions">
            <ion-button fill="clear" (click)="confirmation.settle(false)">{{ request.cancelLabel }}</ion-button>
            <ion-button [color]="request.danger ? 'danger' : 'primary'" (click)="confirmation.settle(true)">
              @if (request.danger) {
                <ion-icon name="trash-outline" slot="start" aria-hidden="true" />
              }
              {{ request.confirmLabel }}
            </ion-button>
          </div>
        </section>
      </ng-template>
    </ion-modal>
  }`,
})
export class ConfirmationDialogComponent {
  readonly confirmation = inject(ConfirmationService);

  constructor() {
    addIcons({ alertCircleOutline, closeOutline, trashOutline });
  }

  dismiss(requestId: number): void {
    if (this.confirmation.current()?.id === requestId) this.confirmation.settle(false);
  }
}
