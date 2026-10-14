import { Component, effect, input, output } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IonButton, IonInput, IonModal, IonSelect, IonSelectOption, IonTextarea } from '@ionic/angular';
import { CredentialPlaintext, credentialTypes, DecryptedCredential } from './credential.models';

@Component({
  selector: 'app-credential-editor',
  imports: [ReactiveFormsModule, IonButton, IonInput, IonModal, IonSelect, IonSelectOption, IonTextarea],
  template: `<ion-modal class="credential-editor-modal" [isOpen]="open()" (didDismiss)="closed.emit()">
    <ng-template>
      <form class="editor-form credential-editor" [formGroup]="form" (ngSubmit)="submit()">
        <div class="field-span editor-context">
          <strong>{{ item() ? 'Edit Credential' : 'Add Credential' }}</strong>
        </div>
        <ion-input label="Name" labelPlacement="stacked" fill="outline" formControlName="name" required />
        <ion-select label="Type" labelPlacement="stacked" fill="outline" formControlName="type">
          @for (type of types; track type.value) {
            <ion-select-option [value]="type.value">{{ type.label }}</ion-select-option>
          }
        </ion-select>
        <ion-input label="Username / Account" labelPlacement="stacked" fill="outline" formControlName="username" />
        <ion-input
          label="Secret / Password / Token"
          labelPlacement="stacked"
          fill="outline"
          [type]="showSecret ? 'text' : 'password'"
          formControlName="secret" />
        <ion-button type="button" fill="clear" (click)="showSecret = !showSecret">{{
          showSecret ? 'Hide secret' : 'Show secret'
        }}</ion-button>
        <ion-input label="URL" labelPlacement="stacked" fill="outline" type="url" formControlName="url" />
        <ion-input label="Host" labelPlacement="stacked" fill="outline" formControlName="host" />
        <ion-input label="Port" labelPlacement="stacked" fill="outline" formControlName="port" />
        <ion-input label="Environment" labelPlacement="stacked" fill="outline" formControlName="environment" />
        <ion-input label="Tags (comma separated)" labelPlacement="stacked" fill="outline" formControlName="tags" />
        <ion-textarea
          class="field-span"
          label="Notes"
          labelPlacement="stacked"
          fill="outline"
          formControlName="notes" />
        <div class="editor-actions field-span">
          <ion-button type="button" fill="clear" (click)="closed.emit()">Cancel</ion-button>
          <ion-button type="submit" [disabled]="form.invalid || saving()">Save Credential</ion-button>
        </div>
      </form>
    </ng-template>
  </ion-modal>`,
})
export class CredentialEditorComponent {
  readonly open = input(false);
  readonly item = input<DecryptedCredential | null>(null);
  readonly saving = input(false);
  readonly saved = output<CredentialPlaintext>();
  readonly closed = output<void>();
  readonly types = credentialTypes;
  showSecret = false;
  readonly form = new FormGroup({
    name: new FormControl('', Validators.required),
    type: new FormControl<CredentialPlaintext['type']>('database', Validators.required),
    username: new FormControl(''),
    secret: new FormControl(''),
    url: new FormControl(''),
    host: new FormControl(''),
    port: new FormControl(''),
    environment: new FormControl(''),
    notes: new FormControl(''),
    tags: new FormControl(''),
  });
  constructor() {
    effect(() => {
      if (this.open()) this.reset();
      else this.clear();
    });
  }
  submit(): void {
    if (this.form.invalid || this.saving()) return;
    const value = this.form.getRawValue();
    this.saved.emit({
      payloadVersion: 1,
      clientRecordId: this.item()?.payload.clientRecordId ?? globalThis.crypto.randomUUID(),
      name: value.name ?? '',
      type: value.type ?? 'other',
      username: value.username ?? '',
      secret: value.secret ?? '',
      url: value.url ?? '',
      host: value.host ?? '',
      port: value.port ?? '',
      environment: value.environment ?? '',
      notes: value.notes ?? '',
      tags: (value.tags ?? '')
        .split(',')
        .map(tag => tag.trim())
        .filter(Boolean),
    });
  }
  private reset(): void {
    const payload = this.item()?.payload;
    this.showSecret = false;
    this.form.reset({
      name: payload?.name ?? '',
      type: payload?.type ?? 'database',
      username: payload?.username ?? '',
      secret: payload?.secret ?? '',
      url: payload?.url ?? '',
      host: payload?.host ?? '',
      port: payload?.port ?? '',
      environment: payload?.environment ?? '',
      notes: payload?.notes ?? '',
      tags: payload?.tags.join(', ') ?? '',
    });
  }
  private clear(): void {
    this.showSecret = false;
    this.form.reset({
      name: '',
      type: 'database',
      username: '',
      secret: '',
      url: '',
      host: '',
      port: '',
      environment: '',
      notes: '',
      tags: '',
    });
  }
}
