import { HttpContextToken } from '@angular/common/http';

export const API_REQUEST_TIMEOUT_MS = 15_000;
export const API_RETRY_DELAYS_MS = [1_500, 3_000] as const;
export const API_MAX_ATTEMPTS = API_RETRY_DELAYS_MS.length + 1;
export const API_RETRY_AFTER_MAX_MS = 30_000;
// Imports upload a file and already had a longer, single-attempt budget.
export const API_IMPORT_TIMEOUT_MS = 60_000;

export const API_RETRY_SAFE_MUTATION = new HttpContextToken<boolean>(() => false);
export const API_RETRYABLE_STATUSES: ReadonlySet<number> = new Set([0, 408, 425, 429, 500, 502, 503, 504]);
