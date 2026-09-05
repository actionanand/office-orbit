import { inject, Service } from '@angular/core';
import { PlatformService } from './platform.service';

@Service()
export class PrintService {
  private readonly platform = inject(PlatformService);
  readonly supported = !this.platform.android;

  print(): void {
    if (this.supported) window.print();
  }
}
