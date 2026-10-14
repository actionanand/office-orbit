import { HttpClient } from '@angular/common/http';
import { DestroyRef, Service, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom, interval } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AlterControlName,
  AlterControlPatchRequest,
  AlterControlState,
  AlterControlsState,
} from '../../shared/models/api.models';
import { apiError } from '../api/api-error';

type AlterControlsResponse = { data: AlterControlsState };

const DISABLED_CONTROL: AlterControlState = { enabled: false, activeUntil: null, remainingSeconds: 0 };

@Service()
export class AlterControlsService {
  private readonly http = inject(HttpClient);
  private readonly destroyRef = inject(DestroyRef);
  private readonly path = '/api/settings/alter-controls';
  private readonly backendState = signal<AlterControlsState | null>(null);
  private readonly clockOffsetMs = signal(0);
  private readonly now = signal(Date.now());
  private request?: Promise<AlterControlsState>;
  readonly loading = signal(false);
  readonly error = signal('');
  readonly state = computed<AlterControlsState | null>(() => {
    const value = this.backendState();
    if (!value) return null;
    return {
      ...value,
      alterSprint: this.project(value.alterSprint),
      alterReleaseManagement: this.project(value.alterReleaseManagement),
    };
  });
  readonly alterSprintEnabled = computed(() => this.state()?.alterSprint.enabled ?? false);
  readonly alterReleaseManagementEnabled = computed(() => this.state()?.alterReleaseManagement.enabled ?? false);
  readonly sprintActiveUntil = computed(() => this.state()?.alterSprint.activeUntil ?? null);
  readonly releaseActiveUntil = computed(() => this.state()?.alterReleaseManagement.activeUntil ?? null);
  readonly sprintRemainingSeconds = computed(() => this.state()?.alterSprint.remainingSeconds ?? 0);
  readonly releaseRemainingSeconds = computed(() => this.state()?.alterReleaseManagement.remainingSeconds ?? 0);

  constructor() {
    interval(15_000)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.now.set(Date.now()));
  }

  refresh(): Promise<AlterControlsState> {
    if (this.request) return this.request;
    return this.fetch();
  }

  refreshFresh(): Promise<AlterControlsState> {
    const pendingRequest = this.request;
    return pendingRequest ? pendingRequest.catch(() => undefined).then(() => this.refresh()) : this.refresh();
  }

  private fetch(): Promise<AlterControlsState> {
    this.loading.set(true);
    this.error.set('');
    const request = firstValueFrom(this.http.get<AlterControlsResponse>(environment.apiBaseUrl + this.path))
      .then(response => this.accept(response.data))
      .catch(error => {
        this.error.set(apiError(error));
        throw error;
      })
      .finally(() => {
        if (this.request === request) this.request = undefined;
        this.loading.set(false);
      });
    this.request = request;
    return request;
  }

  async setControl(control: AlterControlName, enabled: boolean): Promise<AlterControlsState> {
    const body: AlterControlPatchRequest = { control, enabled };
    const response = await firstValueFrom(
      this.http.patch<AlterControlsResponse>(environment.apiBaseUrl + this.path, body),
    );
    return this.accept(response.data);
  }

  private accept(value: AlterControlsState): AlterControlsState {
    const serverTime = Date.parse(value.serverTime);
    this.clockOffsetMs.set(Number.isFinite(serverTime) ? serverTime - Date.now() : 0);
    this.now.set(Date.now());
    this.backendState.set(value);
    this.error.set('');
    return this.state() ?? value;
  }

  private project(value: AlterControlState): AlterControlState {
    this.now();
    if (!value.enabled || !value.activeUntil) return DISABLED_CONTROL;
    const remainingSeconds = Math.max(
      0,
      Math.ceil((Date.parse(value.activeUntil) - (Date.now() + this.clockOffsetMs())) / 1000),
    );
    return remainingSeconds > 0 ? { ...value, remainingSeconds } : DISABLED_CONTROL;
  }
}
