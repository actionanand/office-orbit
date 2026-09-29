import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthState } from '../../core/auth/auth-state';
import { ShellComponent } from './shell.component';

describe('ShellComponent', () => {
  it('provides desktop navigation and the five-item mobile navigation', async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthState, useValue: { authenticated: signal(true) } },
        { provide: AppLockService, useValue: { locked: signal(false) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    const mobileLabels = [...element.querySelectorAll('.bottom-nav a')].map(link => link.textContent?.trim());
    expect(mobileLabels).toEqual(['Dashboard', 'Work Log', 'JIRAs', 'Sprints', 'More']);
    expect(element.querySelector('.sidebar')).toBeTruthy();
  });

  it('keeps routed content between the desktop sidebar and mobile navigation', async () => {
    await TestBed.configureTestingModule({
      imports: [ShellComponent],
      providers: [
        provideRouter([]),
        { provide: AuthState, useValue: { authenticated: signal(true) } },
        { provide: AppLockService, useValue: { locked: signal(false) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ShellComponent);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;

    expect(element.querySelector('.workspace-shell > .sidebar')).toBeTruthy();
    expect(element.querySelector('.workspace-content > router-outlet')).toBeTruthy();
    expect(element.querySelector('.workspace-shell > .bottom-nav')).toBeTruthy();
  });
});
