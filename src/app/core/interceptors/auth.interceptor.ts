import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthState } from '../auth/auth-state';
import { TokenStorageService } from '../storage/token-storage.service';
import { DataCacheService } from '../cache/data-cache.service';
import { NavigationStateService } from '../cache/navigation-state.service';
import { ACTIVITY_THROTTLE_MS } from '../auth/session-policy';

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const state = inject(AuthState);
  const storage = inject(TokenStorageService);
  const router = inject(Router);
  const dataCache = inject(DataCacheService);
  const navigationState = inject(NavigationStateService);
  const url = new URL(request.url, document.baseURI);
  const worker = new URL(environment.apiBaseUrl);
  const protectedRequest =
    url.origin === worker.origin && url.pathname.startsWith('/api/') && url.pathname !== '/api/auth/login';
  const session = state.session();
  const outgoing =
    protectedRequest && session
      ? request.clone({ setHeaders: { Authorization: `Bearer ${session.accessToken}` } })
      : request;
  if (protectedRequest && session && url.pathname !== '/api/auth/renew') {
    const now = Date.now();
    if (now - state.lastActivityAt() >= ACTIVITY_THROTTLE_MS) state.lastActivityAt.set(now);
  }
  return next(outgoing).pipe(
    catchError((error: unknown) => {
      if (
        protectedRequest &&
        error instanceof Object &&
        'status' in error &&
        error.status === 401 &&
        state.session() === session
      ) {
        state.clear();
        dataCache.clear();
        navigationState.clear();
        state.notice.set('Your session has expired. Please sign in again.');
        void storage
          .clear()
          .catch(() => state.notice.set('Session ended. Secure storage could not be cleared; restart and try again.'));
        void router.navigateByUrl('/login', { replaceUrl: true });
      }
      return throwError(() => error);
    }),
  );
};
