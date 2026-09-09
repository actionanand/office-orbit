import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthService } from '../../core/auth/auth.service';
import { StartupService } from '../../core/startup.service';
import { LoginPage } from './login.page';

describe('LoginPage device protection choice', () => {
  it('asks whether to keep or reset an existing PIN after re-authentication', async () => {
    const auth = { login: vi.fn().mockResolvedValue(undefined), state: { notice: signal('') } };
    const lock = {
      enabled: signal(true),
      locked: signal(true),
      unlockAfterSignIn: vi.fn(),
      resetAfterSignIn: vi.fn().mockResolvedValue(undefined),
    };
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AppLockService, useValue: lock },
        { provide: StartupService, useValue: { phase: signal('ready'), retry: vi.fn() } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    const page = TestBed.createComponent(LoginPage).componentInstance;
    page.form.setValue({ username: 'owner', password: 'secret' });
    await page.submit();

    expect(auth.login).toHaveBeenCalledWith('secret');
    expect(page.securityChoice()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();

    await page.resetDeviceProtection();
    expect(lock.resetAfterSignIn).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard', { replaceUrl: true });
  });

  it('offers to save the password via the Credential Management API when available', async () => {
    const auth = { login: vi.fn().mockResolvedValue(undefined), state: { notice: signal('') } };
    const lock = { enabled: signal(false), locked: signal(false), unlockAfterSignIn: vi.fn() };
    const router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    const store = vi.fn().mockResolvedValue(undefined);
    class PasswordCredential {
      readonly id: string;
      constructor(data: { id: string }) {
        this.id = data.id;
      }
    }
    (window as unknown as { PasswordCredential: typeof PasswordCredential }).PasswordCredential = PasswordCredential;
    vi.spyOn(navigator, 'credentials', 'get').mockReturnValue({ store } as unknown as CredentialsContainer);
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AppLockService, useValue: lock },
        { provide: StartupService, useValue: { phase: signal('ready'), retry: vi.fn() } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();

    const page = TestBed.createComponent(LoginPage).componentInstance;
    page.form.setValue({ username: 'owner', password: 'secret' });
    await page.submit();

    expect(store).toHaveBeenCalledOnce();
    expect(store.mock.calls[0][0]).toBeInstanceOf(PasswordCredential);
    delete (window as unknown as { PasswordCredential?: unknown }).PasswordCredential;
    vi.restoreAllMocks();
  });
});
