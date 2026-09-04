import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';
describe('theme preferences', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('ion-palette-dark');
  });
  it('persists explicit modes and restores the preference', () => {
    const theme = TestBed.inject(ThemeService);
    theme.set('dark');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
    expect(localStorage.getItem('office-orbit.theme')).toBe('dark');
    theme.set('light');
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);
  });
  it('follows system changes only in automatic mode', () => {
    let change: () => void = () => undefined;
    const media = {
      matches: false,
      addEventListener: (_event: string, callback: () => void) => {
        change = callback;
      },
    };
    vi.spyOn(window, 'matchMedia').mockReturnValue(media as unknown as MediaQueryList);
    const theme = TestBed.inject(ThemeService);
    theme.set('system');
    media.matches = true;
    change();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(true);
    theme.set('light');
    change();
    expect(document.documentElement.classList.contains('ion-palette-dark')).toBe(false);
    vi.restoreAllMocks();
  });
});
