import { computed, Service, signal } from '@angular/core';
import { finalize, Observable, of, shareReplay, tap } from 'rxjs';

interface CacheEntry<T> {
  value: T;
  updatedAt: number;
}

@Service()
export class DataCacheService {
  private readonly entries = new Map<string, CacheEntry<unknown>>();
  private readonly requests = new Map<string, Observable<unknown>>();
  private readonly versions = new Map<string, number>();
  private clearGeneration = 0;
  private readonly revision = signal(0);
  readonly cleared = signal(0);
  readonly size = computed(() => {
    this.revision();
    return this.entries.size;
  });

  load<T>(key: string, loader: () => Observable<T>, refresh = false): Observable<T> {
    if (refresh) this.invalidate(key);
    const cached = this.entries.get(key) as CacheEntry<T> | undefined;
    if (cached) return of(cached.value);
    const running = this.requests.get(key) as Observable<T> | undefined;
    if (running) return running;
    const version = this.versions.get(key) ?? 0;
    const clearGeneration = this.clearGeneration;
    const request = loader().pipe(
      tap(value => {
        if (version === (this.versions.get(key) ?? 0) && clearGeneration === this.clearGeneration) this.set(key, value);
      }),
      finalize(() => this.requests.delete(key)),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    this.requests.set(key, request);
    return request;
  }

  get<T>(key: string): T | null {
    this.revision();
    return (this.entries.get(key)?.value as T | undefined) ?? null;
  }

  set<T>(key: string, value: T): void {
    this.entries.set(key, { value, updatedAt: Date.now() });
    this.revision.update(revision => revision + 1);
  }

  updatedAt(key: string): number | null {
    this.revision();
    return this.entries.get(key)?.updatedAt ?? null;
  }

  stale(key: string, maxAgeMs = 15 * 60 * 1000): boolean {
    const updatedAt = this.updatedAt(key);
    return updatedAt !== null && Date.now() - updatedAt > maxAgeMs;
  }

  invalidate(keyOrPrefix: string): void {
    const keys = new Set([...this.entries.keys(), ...this.requests.keys(), keyOrPrefix]);
    for (const key of keys)
      if (key === keyOrPrefix || key.startsWith(keyOrPrefix)) {
        this.entries.delete(key);
        this.requests.delete(key);
        this.versions.set(key, (this.versions.get(key) ?? 0) + 1);
      }
    this.revision.update(revision => revision + 1);
  }

  clear(): void {
    this.entries.clear();
    this.requests.clear();
    this.versions.clear();
    this.clearGeneration += 1;
    this.revision.update(revision => revision + 1);
    this.cleared.update(version => version + 1);
  }
}

export function cacheKey(path: string, filters: Readonly<Record<string, string>> = {}): string {
  const query = Object.entries(filters)
    .filter(([, value]) => Boolean(value))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');
  return query ? `${path}?${query}` : path;
}
