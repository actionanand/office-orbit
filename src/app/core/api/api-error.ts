import { HttpErrorResponse } from '@angular/common/http';

export function apiError(error: unknown, login = false): string {
  if (error instanceof Error && error.name === 'TimeoutError')
    return 'The request took too long. Check your connection and try again.';
  if (!(error instanceof HttpErrorResponse)) return 'Something went wrong. Please try again.';
  switch (error.status) {
    case 0:
      return 'Unable to reach Office Orbit. Check your connection and try again.';
    case 400:
      return 'The request could not be accepted. Check your inputs.';
    case 401:
      return login
        ? 'That password was not accepted. Please try again.'
        : 'Your session has expired. Please sign in again.';
    case 404:
      return 'This item could not be found.';
    case 405:
      return 'This action is not supported by the service.';
    case 413:
      return 'This entry is too large. Shorten the content and try again.';
    case 415:
      return 'The service could not read this request.';
    case 429:
      return 'Too many attempts. Please wait a minute before trying again.';
    default:
      return 'The service is temporarily unavailable. Please try again shortly.';
  }
}

export function apiErrorCode(error: unknown): string {
  const responseBody =
    typeof error === 'object' && error !== null && 'error' in error ? (error as { error: unknown }).error : error;
  if (typeof responseBody === 'string') return responseBody;
  if (typeof responseBody !== 'object' || responseBody === null) return '';
  if ('code' in responseBody && typeof responseBody.code === 'string') return responseBody.code;
  const nested = 'error' in responseBody ? responseBody.error : undefined;
  if (typeof nested === 'string') return nested;
  return typeof nested === 'object' && nested !== null && 'code' in nested && typeof nested.code === 'string'
    ? nested.code
    : '';
}
