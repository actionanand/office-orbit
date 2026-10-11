import { TestBed } from '@angular/core/testing';
import { OrbitLoaderComponent } from './orbit-loader.component';

describe('OrbitLoaderComponent', () => {
  it('renders the orbit element with accessible loading status and green defaults', () => {
    const fixture = TestBed.createComponent(OrbitLoaderComponent);
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.querySelector('.loader')?.getAttribute('aria-hidden')).toBe('true');
    expect(host.getAttribute('role')).toBe('status');
    expect(host.getAttribute('aria-label')).toBe('Loading');
    expect(host.style.getPropertyValue('--loader-dimension')).toBe('48px');
    expect(host.style.getPropertyValue('--loader-color-1')).toBe('var(--accent)');
    expect(host.style.getPropertyValue('--loader-color-2')).toBe('var(--accent)');
  });

  it('applies the supplied size and both orbit colors', () => {
    const fixture = TestBed.createComponent(OrbitLoaderComponent);
    fixture.componentRef.setInput('size', 2);
    fixture.componentRef.setInput('colorOne', '#17633f');
    fixture.componentRef.setInput('colorTwo', '#72d9a4');
    fixture.detectChanges();
    const host: HTMLElement = fixture.nativeElement;

    expect(host.style.getPropertyValue('--loader-dimension')).toBe('96px');
    expect(host.style.getPropertyValue('--loader-perspective')).toBe('2000px');
    expect(host.style.getPropertyValue('--loader-color-1')).toBe('#17633f');
    expect(host.style.getPropertyValue('--loader-color-2')).toBe('#72d9a4');
  });
});
