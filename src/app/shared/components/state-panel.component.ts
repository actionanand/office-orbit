import { Component, input, output } from '@angular/core';
import { IonButton, IonIcon, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { alertCircleOutline, fileTrayOutline } from 'ionicons/icons';

@Component({
  selector: 'app-state-panel',
  imports: [IonButton, IonIcon, IonSpinner],
  template: ` <section class="state-panel" aria-live="polite">
    @if (loading()) {
      <ion-spinner name="crescent" aria-label="Loading"></ion-spinner>
      <h2>Bringing your orbit into view</h2>
      <p>Loading the latest information…</p>
      <div class="skeleton-grid" aria-hidden="true">
        @for (placeholder of [1, 2, 3]; track placeholder) {
          <div class="skeleton-card"><span></span><span></span><span></span></div>
        }
      </div>
    } @else {
      <ion-icon [name]="error() ? 'alert-circle-outline' : 'file-tray-outline'" aria-hidden="true"></ion-icon>
      <h2>{{ error() ? 'We couldn’t load this view' : 'Nothing here yet' }}</h2>
      <p>{{ error() || 'No matching items were returned by Office Orbit.' }}</p>
      @if (error()) {
        <ion-button fill="outline" (click)="retry.emit()">Try again</ion-button>
      }
    }
  </section>`,
})
export class StatePanelComponent {
  readonly loading = input(false);
  readonly error = input('');
  readonly retry = output();
  constructor() {
    addIcons({ alertCircleOutline, fileTrayOutline });
  }
}
