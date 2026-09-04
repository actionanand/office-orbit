import { DOCUMENT, inject, Service, signal } from '@angular/core';
export type ThemeMode = 'light' | 'dark' | 'system';

@Service()
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  private readonly media = window.matchMedia('(prefers-color-scheme: dark)');
  readonly mode = signal<ThemeMode>('system');
  constructor() {
    try {
      const saved = localStorage.getItem('office-orbit.theme');
      if (saved === 'light' || saved === 'dark' || saved === 'system') this.mode.set(saved);
    } catch {
      /* Preferences may be unavailable in private browsers. */
    }
    this.apply();
    this.media.addEventListener('change', () => this.apply());
  }
  set(mode: ThemeMode): void {
    this.mode.set(mode);
    try {
      localStorage.setItem('office-orbit.theme', mode);
    } catch {
      /* Theme still works for this session. */
    }
    this.apply();
  }
  private apply(): void {
    const dark = this.mode() === 'dark' || (this.mode() === 'system' && this.media.matches);
    this.document.documentElement.classList.toggle('ion-palette-dark', dark);
    this.document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
    this.document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#101b17' : '#f3f7f4');
  }
}
