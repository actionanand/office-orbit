import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { IonButton, IonContent, IonIcon, IonInput, IonSpinner } from '@ionic/angular';
import { addIcons } from 'ionicons';
import { fingerPrintOutline, lockOpenOutline } from 'ionicons/icons';
import { AppLockService } from '../../core/app-lock/app-lock.service';
@Component({
  selector: 'app-unlock',
  imports: [ReactiveFormsModule, IonButton, IonContent, IonIcon, IonInput, IonSpinner],
  template: `<ion-content
    ><main class="auth-page compact">
      <section class="auth-card">
        <ion-icon name="lock-open-outline" aria-hidden="true" />
        <p class="eyebrow">Local app lock</p>
        <h1>Unlock Office Orbit</h1>
        <p>Your Worker session is valid. Enter your device PIN to continue.</p>
        <form (ngSubmit)="unlock()">
          <ion-input
            label="PIN"
            labelPlacement="stacked"
            fill="outline"
            type="password"
            inputmode="numeric"
            maxlength="6"
            autocomplete="off"
            [formControl]="pin"
            errorText="Enter 4 to 6 digits." />
          @if (message()) {
            <div class="message error" role="alert">{{ message() }}</div>
          }
          <ion-button expand="block" type="submit" [disabled]="busy()">
            @if (busy()) {
              <ion-spinner />
            } @else {
              Unlock
            }
          </ion-button>
          @if (lock.biometricEnabled()) {
            <ion-button expand="block" fill="outline" type="button" (click)="bio()"
              ><ion-icon slot="start" name="finger-print-outline" />Use biometric</ion-button
            >
          }
        </form>
      </section>
    </main></ion-content
  >`,
})
export class UnlockPage {
  readonly lock = inject(AppLockService);
  private router = inject(Router);
  readonly pin = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.pattern(/^\d{4,6}$/)],
  });
  readonly busy = signal(false);
  readonly message = signal('');
  constructor() {
    addIcons({ fingerPrintOutline, lockOpenOutline });
  }
  async unlock() {
    if (this.pin.invalid) {
      this.pin.markAsTouched();
      return;
    }
    await this.perform(() => this.lock.unlock(this.pin.value));
  }
  async bio() {
    await this.perform(() => this.lock.unlockBiometric());
  }
  private async perform(action: () => Promise<void>) {
    if (this.busy()) return;
    this.busy.set(true);
    this.message.set('');
    try {
      await action();
      await this.router.navigateByUrl('/app/dashboard', { replaceUrl: true });
    } catch (error) {
      this.message.set(error instanceof Error ? error.message : 'Unable to unlock. Use your PIN.');
      this.pin.reset();
    } finally {
      this.busy.set(false);
    }
  }
}
