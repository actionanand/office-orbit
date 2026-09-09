import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AppComponent } from './app.component';
import { StartupService } from './core/startup.service';
import { AuthService } from './core/auth/auth.service';
describe('AppComponent', () => {
  const startup = {
    phase: signal<'loading' | 'ready' | 'error'>('loading'),
    reason: signal<'network' | 'local' | null>(null),
    start: vi.fn(),
    retry: vi.fn(),
  };
  beforeEach(() => {
    startup.phase.set('loading');
    startup.reason.set(null);
    startup.start.mockResolvedValue(undefined);
    startup.retry.mockResolvedValue(undefined);
  });
  it('shows a startup shield before a session is ready', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: StartupService, useValue: startup },
        { provide: AuthService, useValue: { recordActivity: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Office Orbit is getting ready');
  });
  it('offers a retry instead of leaving an endless spinner after startup fails', async () => {
    startup.phase.set('error');
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: StartupService, useValue: startup },
        { provide: AuthService, useValue: { recordActivity: vi.fn() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('could not finish starting');
    fixture.nativeElement.querySelector('ion-button').click();
    expect(startup.retry).toHaveBeenCalledOnce();
  });
});
