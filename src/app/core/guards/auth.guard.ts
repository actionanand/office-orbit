import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { StartupService } from '../startup.service';
import { AuthState } from '../auth/auth-state';
import { AppLockService } from '../app-lock/app-lock.service';

export const authGuard: CanActivateFn = async () => {
  const startup = inject(StartupService),
    auth = inject(AuthState),
    lock = inject(AppLockService),
    router = inject(Router);
  await startup.start();
  if (startup.phase() !== 'ready') return router.parseUrl('/login');
  if (!auth.valid()) return router.parseUrl('/login');
  return lock.locked() ? router.parseUrl('/unlock') : true;
};
export const unlockGuard: CanActivateFn = async () => {
  const startup = inject(StartupService),
    auth = inject(AuthState),
    lock = inject(AppLockService),
    router = inject(Router);
  await startup.start();
  if (!auth.valid()) return router.parseUrl('/login');
  return lock.locked() ? true : router.parseUrl('/app/dashboard');
};
export const loginGuard: CanActivateFn = async () => {
  const startup = inject(StartupService),
    auth = inject(AuthState),
    lock = inject(AppLockService),
    router = inject(Router);
  await startup.start();
  return auth.valid() ? router.parseUrl(lock.locked() ? '/unlock' : '/app/dashboard') : true;
};
