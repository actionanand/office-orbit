import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { signal } from '@angular/core';
import { AppComponent } from './app.component';
import { StartupService } from './core/startup.service';
describe('AppComponent', () => {
  it('shows a startup shield before a session is ready', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: StartupService, useValue: { phase: signal('loading'), start: () => Promise.resolve() } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Opening your workspace');
  });
});
