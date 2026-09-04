import { HttpErrorResponse } from '@angular/common/http';

export function apiError(error: unknown, login = false): string {
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
    case 429:
      return 'Too many attempts. Please wait a minute before trying again.';
    default:
      return 'The service is temporarily unavailable. Please try again shortly.';
  }
}
