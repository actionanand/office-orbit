import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthService } from '../../core/auth/auth.service';
import { BiometricService } from '../../core/platform/biometric.service';
import { PlatformService } from '../../core/platform/platform.service';
import { ThemeService } from '../../core/theme/theme.service';
import { SettingsPage } from './settings.page';

describe('SettingsPage', () => {
  it('shows human session and app information without the API URL', async () => {
    const session = signal({
      accessToken: 'hidden',
      expiresAt: Date.now() + 60000,
      renewAfter: Date.now() + 45000,
      sessionExpiresAt: Date.now() + 600000,
    });
    await TestBed.configureTestingModule({
      imports: [SettingsPage],
      providers: [
        { provide: ThemeService, useValue: { mode: signal('system'), set: vi.fn() } },
        { provide: PlatformService, useValue: { android: false, label: 'Web' } },
        { provide: AuthService, useValue: { signOut: vi.fn(), state: { session } } },
        {
          provide: AppLockService,
          useValue: {
            enabled: signal(false),
            biometricEnabled: signal(false),
            setPin: vi.fn(),
            disable: vi.fn(),
            setBiometric: vi.fn(),
          },
        },
        { provide: BiometricService, useValue: { available: signal(false) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SettingsPage);
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Office Orbit keeps your session active while you are working.');
    expect(text).toContain('Session expires by');
    expect(text).toContain('Version');
    expect(text).not.toContain('work-tracker-api');
    expect(text).not.toContain('API environment');
    expect(text).not.toContain('Worker password');
    expect(text).not.toContain('JWT');
  });
});
