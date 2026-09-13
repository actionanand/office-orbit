import { Service, signal } from '@angular/core';

export interface ConfirmationOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
}

export interface ConfirmationRequest extends Required<ConfirmationOptions> {
  id: number;
}

@Service()
export class ConfirmationService {
  private nextId = 0;
  private resolve?: (confirmed: boolean) => void;
  readonly current = signal<ConfirmationRequest | null>(null);

  confirm(options: ConfirmationOptions): Promise<boolean> {
    this.resolve?.(false);
    const request: ConfirmationRequest = {
      id: ++this.nextId,
      title: options.title,
      message: options.message,
      confirmLabel: options.confirmLabel ?? 'Confirm',
      cancelLabel: options.cancelLabel ?? 'Cancel',
      danger: options.danger ?? false,
    };
    this.current.set(request);
    return new Promise(resolve => {
      this.resolve = resolve;
    });
  }

  settle(confirmed: boolean): void {
    const resolve = this.resolve;
    this.resolve = undefined;
    this.current.set(null);
    resolve?.(confirmed);
  }
}
