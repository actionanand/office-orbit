import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { defer, mergeMap, retry, takeUntil, throwError, TimeoutError, timer } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  API_MAX_ATTEMPTS,
  API_REQUEST_TIMEOUT_MS,
  API_RETRY_AFTER_MAX_MS,
  API_RETRY_DELAYS_MS,
  API_RETRY_SAFE_MUTATION,
  API_RETRYABLE_STATUSES,
} from '../api/api-retry-policy';

export const apiRetryInterceptor: HttpInterceptorFn = (request, next) => {
  const url = new URL(request.url, document.baseURI);
  const worker = new URL(environment.apiBaseUrl);
  if (
    url.origin !== worker.origin ||
    !url.pathname.startsWith('/api/') ||
    url.pathname === '/api/auth' ||
    url.pathname.startsWith('/api/auth/')
  )
    return next(request);

  // An absolute deadline per subscription also covers requests that emit progress events.
  const attempt = defer(() =>
    next(request).pipe(
      takeUntil(
        timer(request.timeout ?? API_REQUEST_TIMEOUT_MS).pipe(mergeMap(() => throwError(() => new TimeoutError()))),
      ),
    ),
  );
  const eligible =
    request.method === 'GET' ||
    request.method === 'QUERY' ||
    (request.method === 'PATCH' &&
      request.context.has(API_RETRY_SAFE_MUTATION) &&
      request.context.get(API_RETRY_SAFE_MUTATION));
  if (!eligible) return attempt;

  return attempt.pipe(
    retry({
      count: API_MAX_ATTEMPTS - 1,
      delay: (error: unknown, retryNumber) => {
        if (
          !(error instanceof TimeoutError) &&
          !(error instanceof HttpErrorResponse && API_RETRYABLE_STATUSES.has(error.status))
        ) {
          return throwError(() => error);
        }
        const delay = API_RETRY_DELAYS_MS[retryNumber - 1];
        return timer(retryAfterDelay(error) ?? delay);
      },
    }),
  );
};

function retryAfterDelay(error: unknown): number | null {
  if (!(error instanceof HttpErrorResponse) || error.status !== 429) return null;
  const value = error.headers.get('Retry-After')?.trim();
  if (!value) return null;
  const milliseconds = /^\d+$/.test(value) ? Number(value) * 1000 : Date.parse(value) - Date.now();
  return Number.isFinite(milliseconds) && milliseconds >= 0 ? Math.min(milliseconds, API_RETRY_AFTER_MAX_MS) : null;
}
