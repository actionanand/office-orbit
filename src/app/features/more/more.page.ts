import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonContent, IonHeader, IonTitle, IonToolbar, IonIcon } from '@ionic/angular';
import { navigation } from '../../shared/navigation';
import { addIcons } from 'ionicons';
import { chevronForwardOutline } from 'ionicons/icons';
@Component({
  selector: 'app-more',
  imports: [RouterLink, IonContent, IonHeader, IonTitle, IonToolbar, IonIcon],
  template: `<ion-header class="ion-no-border"
      ><ion-toolbar><ion-title>More</ion-title></ion-toolbar></ion-header
    ><ion-content
      ><main class="page-wrap">
        <header class="page-heading">
          <p class="eyebrow">The rest of your orbit</p>
          <h1>More</h1>
        </header>
        <nav class="more-grid" aria-label="More workspace pages">
          @for (item of items; track item.path) {
            <a class="data-card" [routerLink]="'/app/' + item.path"
              ><ion-icon [name]="item.icon" aria-hidden="true" /><span>{{ item.label }}</span
              ><ion-icon name="chevron-forward-outline" aria-hidden="true"
            /></a>
          }
        </nav></main
    ></ion-content>`,
})
export class MorePage {
  readonly items = navigation.slice(4);
  constructor() {
    addIcons({ chevronForwardOutline });
  }
}
