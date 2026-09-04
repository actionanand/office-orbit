import { inject, Service } from '@angular/core';
import { PlatformService } from './platform.service';
export function safeUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}
@Service()
export class LinksService {
  private readonly platform = inject(PlatformService);
  async open(value: string): Promise<void> {
    const url = safeUrl(value);
    if (!url) return;
    if (this.platform.android) {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } else window.open(url, '_blank', 'noopener,noreferrer');
  }
}
