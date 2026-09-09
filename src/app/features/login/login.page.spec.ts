import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AppLockService } from '../../core/app-lock/app-lock.service';
import { AuthService } from '../../core/auth/auth.service';
import { CredentialManagerService } from '../../core/platform/credential-manager.service';
import { PlatformService } from '../../core/platform/platform.service';
import { StartupService } from '../../core/startup.service';
import { LoginPage } from './login.page';

describe('LoginPage credentials and device protection', () => {
  let auth: { login: ReturnType<typeof vi.fn>; state: { notice: ReturnType<typeof signal<string>> } };
  let lock: {
    enabled: ReturnType<typeof signal<boolean>>;
    locked: ReturnType<typeof signal<boolean>>;
    unlockAfterSignIn: ReturnType<typeof vi.fn>;
    resetAfterSignIn: ReturnType<typeof vi.fn>;
  };
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };
  let credentials: {
    savePassword: ReturnType<typeof vi.fn>;
    getPassword: ReturnType<typeof vi.fn>;
  };

  async function create(android = true, pinEnabled = false): Promise<ComponentFixture<LoginPage>> {
    auth = { login: vi.fn().mockResolvedValue(undefined), state: { notice: signal('') } };
    lock = {
      enabled: signal(pinEnabled),
      locked: signal(pinEnabled),
      unlockAfterSignIn: vi.fn(),
      resetAfterSignIn: vi.fn().mockResolvedValue(undefined),
    };
    router = { navigateByUrl: vi.fn().mockResolvedValue(true) };
    credentials = {
      savePassword: vi.fn().mockResolvedValue(undefined),
      getPassword: vi.fn().mockResolvedValue({ status: 'success', username: 'owner', password: 'secret' }),
    };
    await TestBed.configureTestingModule({
      imports: [LoginPage],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: AppLockService, useValue: lock },
        { provide: CredentialManagerService, useValue: credentials },
        { provide: PlatformService, useValue: { android } },
        { provide: StartupService, useValue: { phase: signal('ready'), retry: vi.fn() } },
        { provide: Router, useValue: router },
      ],
    }).compileComponents();
    return TestBed.createComponent(LoginPage);
  }

  afterEach(() => TestBed.resetTestingModule());

  it('saves an Android credential only after successful Worker authentication', async () => {
    const page = (await create()).componentInstance;
    page.form.setValue({ username: 'owner', password: 'secret' });
    await page.submit();

    expect(auth.login).toHaveBeenCalledWith('secret');
    expect(credentials.savePassword).toHaveBeenCalledWith('owner', 'secret');
    expect(auth.login.mock.invocationCallOrder[0]).toBeLessThan(credentials.savePassword.mock.invocationCallOrder[0]);
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard', { replaceUrl: true });
  });

  it('never saves a credential after a failed Worker login', async () => {
    const page = (await create()).componentInstance;
    auth.login.mockRejectedValueOnce(new Error('Sign in failed.'));
    page.form.setValue({ username: 'owner', password: 'wrong' });
    await page.submit();

    expect(credentials.savePassword).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(page.form.controls.password.value).toBe('');
  });

  it('continues login when the optional password save is cancelled', async () => {
    const page = (await create()).componentInstance;
    credentials.savePassword.mockResolvedValueOnce(undefined);
    page.form.setValue({ username: 'owner', password: 'secret' });
    await page.submit();

    expect(lock.unlockAfterSignIn).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledOnce();
  });

  it('fills a retrieved credential without submitting it', async () => {
    const page = (await create()).componentInstance;
    await page.useSavedPassword();

    expect(page.form.getRawValue()).toEqual({ username: 'owner', password: 'secret' });
    expect(page.visible()).toBe(false);
    expect(auth.login).not.toHaveBeenCalled();
    expect(page.credentialMessage()).toContain('Press Sign in');
  });

  it('silently remains on login when saved-password selection is cancelled', async () => {
    const page = (await create()).componentInstance;
    credentials.getPassword.mockResolvedValueOnce({ status: 'cancelled' });
    await page.useSavedPassword();

    expect(page.credentialMessage()).toBe('');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('asks whether to keep or reset an existing PIN after re-authentication', async () => {
    const page = (await create(true, true)).componentInstance;
    page.form.setValue({ username: 'owner', password: 'secret' });
    await page.submit();

    expect(page.securityChoice()).toBe(true);
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    await page.resetDeviceProtection();
    expect(lock.resetAfterSignIn).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/app/dashboard', { replaceUrl: true });
  });

  it('keeps autofill metadata and shows saved-password retrieval only on Android', async () => {
    const androidFixture = await create(true);
    androidFixture.detectChanges();
    const androidRoot = androidFixture.nativeElement as HTMLElement;
    expect(androidRoot.querySelector('form')?.getAttribute('autocomplete')).toBe('on');
    expect(androidRoot.querySelector('[name="username"]')?.getAttribute('autocomplete')).toBe('username');
    expect(androidRoot.querySelector('[name="password"]')?.getAttribute('autocomplete')).toBe('current-password');
    expect(androidRoot.textContent).toContain('Use saved password');

    TestBed.resetTestingModule();
    const webFixture = await create(false);
    webFixture.detectChanges();
    expect((webFixture.nativeElement as HTMLElement).textContent).not.toContain('Use saved password');
  });
});
