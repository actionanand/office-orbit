import { Service } from '@angular/core';
import { Capacitor } from '@capacitor/core';

@Service()
export class PlatformService {
  readonly android = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
  readonly native = Capacitor.isNativePlatform();
  readonly label = this.android ? 'Android' : 'Web';
}
