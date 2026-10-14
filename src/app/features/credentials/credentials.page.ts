import { Component, computed, effect, inject, signal } from '@angular/core';
import {
  IonButton,
  IonCheckbox,
  IonContent,
  IonHeader,
  IonInput,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular';
import { firstValueFrom } from 'rxjs';
import { apiErrorCode } from '../../core/api/api-error';
import { ConfirmationService } from '../../core/notifications/confirmation.service';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { LinksService, safeUrl } from '../../core/platform/links.service';
import { CredentialCryptoService } from './credential-crypto.service';
import { CredentialEditorComponent } from './credential-editor.component';
import {
  CredentialPlaintext,
  CredentialType,
  CredentialVaultMetadata,
  DecryptedCredential,
  credentialTypes,
} from './credential.models';
import { CredentialVaultApiService, CredentialVaultSessionService } from './credential-vault.service';

type ValueEvent = { detail: { value?: string | null } };
type CheckedEvent = { detail: { checked: boolean } };

@Component({
  selector: 'app-credentials',
  imports: [
    IonButton,
    IonCheckbox,
    IonContent,
    IonHeader,
    IonInput,
    IonSelect,
    IonSelectOption,
    IonTitle,
    IonToolbar,
    CredentialEditorComponent,
  ],
  template: `
    <ion-header class="ion-no-border"
      ><ion-toolbar><ion-title>Credentials</ion-title></ion-toolbar></ion-header
    >
    <ion-content
      ><main class="page-wrap credentials-page">
        @if (state() === 'loading') {
          <p>Loading Credential Vault…</p>
        } @else if (state() === 'setup') {
          <section class="credential-gate">
            <p class="eyebrow">Credential Vault</p>
            <h1>Create Credential Vault</h1>
            <p>Keep this passphrase safe. It cannot be recovered if you forget it.</p>
            <ion-input
              label="Vault passphrase"
              labelPlacement="stacked"
              fill="outline"
              type="password"
              [value]="passphrase()"
              (ionInput)="setPassphrase($event, false)" />
            <ion-input
              label="Confirm Vault passphrase"
              labelPlacement="stacked"
              fill="outline"
              type="password"
              [value]="confirmation()"
              (ionInput)="setPassphrase($event, true)" />
            @if (error()) {
              <p class="form-error" role="alert">{{ error() }}</p>
            }
            <ion-button (click)="initialize()" [disabled]="busy()">Create Vault</ion-button>
          </section>
        } @else if (state() === 'locked') {
          <section class="credential-gate">
            <p class="eyebrow">Credential Vault</p>
            <h1>Unlock Credentials</h1>
            <p>Encrypted locally. The server stores ciphertext only.</p>
            <ion-input
              label="Vault passphrase"
              labelPlacement="stacked"
              fill="outline"
              type="password"
              [value]="passphrase()"
              (ionInput)="setPassphrase($event, false)" />
            @if (error()) {
              <p class="form-error" role="alert">{{ error() }}</p>
            }
            <ion-button (click)="unlock()" [disabled]="busy()">Unlock Vault</ion-button>
          </section>
        } @else {
          <header class="page-heading credential-heading">
            <div>
              <p class="eyebrow">Credential Vault</p>
              <h1>Credentials</h1>
              <p>Encrypted locally. The server stores ciphertext only.</p>
            </div>
            <div>
              <ion-button fill="outline" (click)="lock()">Lock Vault</ion-button
              ><ion-button (click)="addCredential()">Add Credential</ion-button>
            </div>
          </header>
          <section class="credential-toolbar">
            <ion-input
              aria-label="Search credentials"
              placeholder="Search credentials"
              [value]="search()"
              (ionInput)="setSearch($event)" />
            <ion-select aria-label="Filter credential type" [value]="typeFilter()" (ionChange)="setTypeFilter($event)"
              ><ion-select-option value="">All types</ion-select-option>
              @for (type of types; track type.value) {
                <ion-select-option [value]="type.value">{{ type.label }}</ion-select-option>
              }
            </ion-select>
            @if (selected().size) {
              <ion-button fill="clear" (click)="clearSelection()">Clear selection</ion-button
              ><ion-button color="danger" (click)="deleteSelected()">Delete {{ selected().size }}</ion-button>
            }
          </section>
          <div class="credential-selection">
            <ion-button fill="clear" (click)="selectVisible()">Select all visible</ion-button
            ><span>{{ filtered().length }} credentials</span>
          </div>
          <section class="credential-list" aria-label="Credentials">
            @for (credential of filtered(); track credential.encrypted.id) {
              <article class="credential-card">
                <ion-checkbox
                  [checked]="selected().has(credential.encrypted.id)"
                  [aria-label]="'Select ' + credential.payload.name"
                  (ionChange)="toggle(credential.encrypted.id, $event)" />
                <div class="credential-copy">
                  <strong>{{ credential.payload.name }}</strong
                  ><span
                    >{{ typeLabel(credential.payload.type) }}
                    @if (credential.payload.username) {
                      · {{ credential.payload.username }}
                    }
                    @if (credential.payload.environment) {
                      · {{ credential.payload.environment }}
                    }
                  </span>
                  <div class="credential-secret">
                    {{ revealed().has(credential.encrypted.id) ? credential.payload.secret : '••••••••••••' }}
                  </div>
                </div>
                <div class="credential-actions">
                  <ion-button
                    fill="clear"
                    [attr.aria-label]="'Copy username for ' + credential.payload.name"
                    (click)="copy(credential.payload.username, 'Username copied.')"
                    >Copy username</ion-button
                  ><ion-button
                    fill="clear"
                    [attr.aria-label]="
                      (revealed().has(credential.encrypted.id) ? 'Hide' : 'Reveal') +
                      ' secret for ' +
                      credential.payload.name
                    "
                    (click)="reveal(credential)"
                    >{{ revealed().has(credential.encrypted.id) ? 'Hide' : 'Reveal' }}</ion-button
                  ><ion-button
                    fill="clear"
                    [attr.aria-label]="'Copy secret for ' + credential.payload.name"
                    (click)="copy(credential.payload.secret, 'Secret copied.')"
                    >Copy secret</ion-button
                  >
                  @if (validUrl(credential.payload.url)) {
                    <ion-button fill="clear" (click)="openUrl(credential.payload.url)">Open</ion-button>
                  }
                  <ion-button fill="clear" (click)="editCredential(credential)">Edit</ion-button
                  ><ion-button fill="clear" color="danger" (click)="deleteOne(credential)">Delete</ion-button>
                </div>
              </article>
            }
          </section>
          <app-credential-editor
            [open]="editorOpen() || editing() !== null"
            [item]="editing()"
            [saving]="credentialSaving()"
            (closed)="closeEditor()"
            (activity)="touch()"
            (saved)="saveCredential($event)" />
        }</main
    ></ion-content>
  `,
})
export class CredentialsPage {
  private readonly api = inject(CredentialVaultApiService);
  private readonly crypto = inject(CredentialCryptoService);
  private readonly session = inject(CredentialVaultSessionService);
  private readonly confirm = inject(ConfirmationService);
  private readonly snackbar = inject(SnackbarService);
  private readonly links = inject(LinksService);
  private readonly revealTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly state = signal<'loading' | 'setup' | 'locked' | 'unlocked'>('loading');
  readonly metadata = signal<CredentialVaultMetadata | null>(null);
  readonly records = signal<DecryptedCredential[]>([]);
  readonly search = signal('');
  readonly typeFilter = signal<CredentialType | ''>('');
  readonly selected = signal<Set<string>>(new Set());
  readonly revealed = signal<Set<string>>(new Set());
  readonly passphrase = signal('');
  readonly confirmation = signal('');
  readonly error = signal('');
  readonly busy = signal(false);
  readonly credentialSaving = signal(false);
  readonly editorOpen = signal(false);
  readonly editing = signal<DecryptedCredential | null>(null);
  readonly types = credentialTypes;
  readonly filtered = computed(() => {
    const search = this.search().trim().toLowerCase();
    return this.records().filter(
      record =>
        (!this.typeFilter() || record.payload.type === this.typeFilter()) &&
        (!search ||
          [
            record.payload.name,
            this.typeLabel(record.payload.type),
            record.payload.username,
            record.payload.url,
            record.payload.host,
            record.payload.environment,
            ...record.payload.tags,
          ]
            .join(' ')
            .toLowerCase()
            .includes(search)),
    );
  });

  constructor() {
    effect(() => {
      if (this.state() === 'unlocked' && !this.session.key()) this.clearUnlockedState();
    });
    void this.loadMetadata();
  }

  setPassphrase(event: ValueEvent, confirmation: boolean): void {
    (confirmation ? this.confirmation : this.passphrase).set(event.detail.value ?? '');
  }
  setSearch(event: ValueEvent): void {
    this.search.set(event.detail.value ?? '');
    this.touch();
  }
  setTypeFilter(event: ValueEvent): void {
    const value = event.detail.value ?? '';
    this.typeFilter.set(credentialTypes.some(type => type.value === value) ? (value as CredentialType) : '');
    this.touch();
  }
  clearSelection(): void {
    this.selected.set(new Set<string>());
    this.touch();
  }
  addCredential(): void {
    this.editorOpen.set(true);
    this.touch();
  }
  editCredential(credential: DecryptedCredential): void {
    this.editing.set(credential);
    this.touch();
  }

  async initialize(): Promise<void> {
    const passphrase = this.passphrase();
    if (passphrase.length < 12) return this.error.set('Vault passphrase must be at least 12 characters.');
    if (passphrase !== this.confirmation()) return this.error.set('Vault passphrases do not match.');
    this.busy.set(true);
    try {
      const salt = this.crypto.randomSalt();
      const key = await this.crypto.deriveKey(passphrase, salt, 310_000);
      const check = await this.crypto.createKeyCheck(key);
      const metadata = await firstValueFrom(
        this.api.initialize({
          cryptoVersion: 1,
          kdf: 'PBKDF2-SHA-256',
          kdfIterations: 310_000,
          salt,
          keyCheckIv: check.iv,
          keyCheckCiphertext: check.ciphertext,
        }),
      );
      this.metadata.set(metadata);
      this.session.unlock(key);
      this.passphrase.set('');
      this.confirmation.set('');
      await this.loadCredentials();
    } catch (error) {
      if (apiErrorCode(error) === 'CREDENTIAL_VAULT_ALREADY_INITIALIZED') await this.loadMetadata();
      else this.error.set('Credential Vault is temporarily unavailable.');
    } finally {
      this.busy.set(false);
    }
  }

  async unlock(): Promise<void> {
    const metadata = this.metadata();
    if (!metadata?.initialized) return;
    this.busy.set(true);
    this.error.set('');
    try {
      const key = await this.crypto.deriveKey(this.passphrase(), metadata.salt, metadata.kdfIterations);
      const valid = await this.crypto.verifiesKeyCheck(key, {
        cryptoVersion: 1,
        iv: metadata.keyCheckIv,
        ciphertext: metadata.keyCheckCiphertext,
      });
      if (!valid) return this.error.set('Incorrect Vault passphrase.');
      this.session.unlock(key);
      this.passphrase.set('');
      await this.loadCredentials();
    } catch {
      this.error.set('Incorrect Vault passphrase.');
    } finally {
      this.busy.set(false);
    }
  }

  lock(): void {
    this.session.lock();
    this.clearUnlockedState();
  }
  touch(): void {
    this.session.touch();
  }

  async saveCredential(payload: CredentialPlaintext): Promise<void> {
    if (this.credentialSaving()) return;
    const key = this.session.key();
    if (!key) return this.lock();
    this.credentialSaving.set(true);
    this.touch();
    const current = this.editing();
    try {
      const envelope = await this.crypto.encryptCredential(key, payload);
      const response = current
        ? await firstValueFrom(
            this.api.update(current.encrypted.id, { ...envelope, expectedRevision: current.encrypted.revision }),
          )
        : await firstValueFrom(this.api.create(envelope));
      const next: DecryptedCredential = { encrypted: response.data, payload };
      this.records.update(records =>
        current
          ? records.map(record => (record.encrypted.id === current.encrypted.id ? next : record))
          : [next, ...records],
      );
      this.closeEditor();
      this.snackbar.success(current ? 'Credential updated.' : 'Credential added.');
    } catch (error) {
      if (apiErrorCode(error) === 'CREDENTIAL_VERSION_CONFLICT') {
        this.snackbar.error('This credential changed on another device. The list was refreshed.');
        await this.loadCredentials();
      } else if (!current && (await this.reconcileUncertainCreate(payload.clientRecordId))) {
        this.closeEditor();
        this.snackbar.success('Credential added.');
      } else {
        this.snackbar.error(
          current
            ? 'Unable to update credential.'
            : 'Creation could not be confirmed. Review the list before retrying.',
        );
      }
    } finally {
      this.credentialSaving.set(false);
    }
  }

  async deleteOne(record: DecryptedCredential): Promise<void> {
    this.touch();
    const confirmed = await this.confirm.confirm({
      title: 'Delete credential?',
      message: `Delete ${record.payload.name}? This cannot be undone.`,
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      await firstValueFrom(this.api.delete(record.encrypted.id));
      this.records.update(records => records.filter(item => item.encrypted.id !== record.encrypted.id));
    } catch {
      await this.loadCredentials();
      const stillExists = this.records().some(item => item.payload.clientRecordId === record.payload.clientRecordId);
      if (stillExists) this.snackbar.error('Delete could not be confirmed. Review the refreshed list before retrying.');
      else this.snackbar.success('Credential deleted.');
    }
  }

  async deleteSelected(): Promise<void> {
    this.touch();
    const ids = [...this.selected()];
    if (!ids.length || ids.length > 25) return;
    const confirmed = await this.confirm.confirm({
      title: `Delete ${ids.length} credentials?`,
      message: 'Deletion is permanent.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!confirmed) return;
    try {
      const result = await firstValueFrom(this.api.bulkDelete(ids));
      const removed = new Set(ids.filter(id => !result.failed.some(failure => failure.id === id)));
      this.records.update(records => records.filter(record => !removed.has(record.encrypted.id)));
      this.selected.set(new Set(result.failed.map(failure => failure.id)));
      if (result.failed.length) this.snackbar.error(`${result.failed.length} credentials could not be deleted.`);
    } catch {
      await this.loadCredentials();
      const retained = new Set(this.records().map(record => record.encrypted.id));
      this.selected.set(new Set(ids.filter(id => retained.has(id))));
      this.snackbar.error('Bulk deletion could not be confirmed. Review the refreshed list before retrying.');
    }
  }

  toggle(id: string, event: CheckedEvent): void {
    this.selected.update(selected => {
      const next = new Set(selected);
      if (event.detail.checked && next.size < 25) next.add(id);
      else next.delete(id);
      return next;
    });
    this.touch();
  }
  selectVisible(): void {
    this.selected.set(
      new Set(
        this.filtered()
          .slice(0, 25)
          .map(record => record.encrypted.id),
      ),
    );
    this.touch();
  }
  reveal(record: DecryptedCredential): void {
    const id = record.encrypted.id;
    const existingTimer = this.revealTimers.get(id);
    if (existingTimer) clearTimeout(existingTimer);
    if (this.revealed().has(id)) {
      this.revealed.update(values => {
        const next = new Set(values);
        next.delete(id);
        return next;
      });
      this.revealTimers.delete(id);
    } else {
      this.revealed.update(values => new Set(values).add(id));
      this.revealTimers.set(
        id,
        setTimeout(() => this.hideSecret(id), 30_000),
      );
    }
    this.touch();
  }
  async copy(value: string, message: string): Promise<void> {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      this.snackbar.success(message);
      this.touch();
    } catch {
      this.snackbar.error('Unable to copy.');
    }
  }
  validUrl(value: string): boolean {
    return safeUrl(value) !== null;
  }
  openUrl(value: string): void {
    void this.links.open(value);
    this.touch();
  }
  typeLabel(type: CredentialType): string {
    return credentialTypes.find(item => item.value === type)?.label ?? 'Other';
  }
  closeEditor(): void {
    this.editorOpen.set(false);
    this.editing.set(null);
  }

  private hideSecret(id: string): void {
    this.revealTimers.delete(id);
    this.revealed.update(values => {
      const next = new Set(values);
      next.delete(id);
      return next;
    });
  }
  private clearUnlockedState(): void {
    for (const timer of this.revealTimers.values()) clearTimeout(timer);
    this.revealTimers.clear();
    this.records.set([]);
    this.revealed.set(new Set());
    this.selected.set(new Set());
    this.editing.set(null);
    this.editorOpen.set(false);
    this.credentialSaving.set(false);
    this.passphrase.set('');
    this.confirmation.set('');
    this.error.set('');
    this.state.set('locked');
  }
  private async reconcileUncertainCreate(clientRecordId: string): Promise<boolean> {
    await this.loadCredentials();
    return this.records().some(record => record.payload.clientRecordId === clientRecordId);
  }
  private async loadMetadata(): Promise<void> {
    try {
      const metadata = await firstValueFrom(this.api.metadata());
      this.metadata.set(metadata);
      this.state.set(metadata.initialized ? 'locked' : 'setup');
    } catch {
      this.error.set('Credential Vault is temporarily unavailable.');
      this.state.set('locked');
    }
  }
  private async loadCredentials(): Promise<void> {
    const key = this.session.key();
    if (!key) return this.lock();
    try {
      const response = await firstValueFrom(this.api.list());
      const records: DecryptedCredential[] = [];
      for (const encrypted of response.data) {
        try {
          records.push({ encrypted, payload: await this.crypto.decryptCredential(key, encrypted) });
        } catch {
          /* Corrupt records remain ciphertext-only. */
        }
      }
      this.records.set(records);
      this.state.set('unlocked');
    } catch {
      this.snackbar.error('Credential Vault is temporarily unavailable.');
    }
  }
}
