import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, provideRouter } from '@angular/router';
import { authGuard } from './auth.guard';
import { StartupService } from '../startup.service';
import { AuthState } from '../auth/auth-state';
import { AppLockService } from '../app-lock/app-lock.service';
import { signal } from '@angular/core';
describe('authGuard', () => {
  const locked = signal(false);
  beforeEach(() => {
    locked.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: StartupService, useValue: { start: () => Promise.resolve(), phase: () => 'ready' } },
        { provide: AppLockService, useValue: { locked } },
      ],
    });
  });
  const check = () =>
    TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
  it('rejects anonymous access', async () => {
    expect(await check()).toEqual(TestBed.inject(Router).parseUrl('/login'));
  });
  it('requires local unlock even with a valid Worker session', async () => {
    const state = TestBed.inject(AuthState);
    state.session.set({ accessToken: 'test', expiresAt: Date.now() + 60000 });
    state.verified.set(true);
    locked.set(true);
    expect(await check()).toEqual(TestBed.inject(Router).parseUrl('/unlock'));
    locked.set(false);
    expect(await check()).toBe(true);
  });
  it('does not let local unlock bypass an expired session', async () => {
    const state = TestBed.inject(AuthState);
    state.session.set({ accessToken: 'test', expiresAt: 0 });
    state.verified.set(true);
    expect(await check()).toEqual(TestBed.inject(Router).parseUrl('/login'));
  });
});
