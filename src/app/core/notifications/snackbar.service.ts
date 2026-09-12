import { DestroyRef, Service, inject, signal } from '@angular/core';

export type SnackbarTone = 'success' | 'info' | 'error';

export interface SnackbarMessage {
  id: number;
  text: string;
  tone: SnackbarTone;
}

@Service()
export class SnackbarService {
  private readonly destroyRef = inject(DestroyRef);
  private timer?: number;
  private nextId = 0;
  readonly current = signal<SnackbarMessage | null>(null);

  constructor() {
    this.destroyRef.onDestroy(() => this.clearTimer());
  }

  show(text: string, tone: SnackbarTone = 'info', duration = tone === 'error' ? 5000 : 3500): void {
    const message = { id: ++this.nextId, text, tone };
    this.clearTimer();
    this.current.set(message);
    this.timer = window.setTimeout(() => this.dismiss(message.id), duration);
  }

  success(text: string): void {
    this.show(text, 'success');
  }

  error(text: string): void {
    this.show(text, 'error');
  }

  dismiss(id?: number): void {
    if (id !== undefined && this.current()?.id !== id) return;
    this.clearTimer();
    this.current.set(null);
  }

  private clearTimer(): void {
    if (this.timer !== undefined) window.clearTimeout(this.timer);
    this.timer = undefined;
  }
}
