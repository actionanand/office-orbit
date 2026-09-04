import { TestBed } from '@angular/core/testing';
import { defer, firstValueFrom, of } from 'rxjs';
import { cacheKey, DataCacheService } from './data-cache.service';

describe('DataCacheService', () => {
  it('reuses a cache hit and manual refresh runs the loader again', async () => {
    const cache = TestBed.inject(DataCacheService);
    let calls = 0;
    const load = () => defer(() => of(++calls));
    expect(await firstValueFrom(cache.load('jiras:active', load))).toBe(1);
    expect(await firstValueFrom(cache.load('jiras:active', load))).toBe(1);
    expect(calls).toBe(1);
    expect(await firstValueFrom(cache.load('jiras:active', load, true))).toBe(2);
    expect(calls).toBe(2);
  });

  it('builds stable and distinct keys for different filters', () => {
    expect(cacheKey('/api/work-logs', { to: '2026-09-30', from: '2026-09-01' })).toBe(
      cacheKey('/api/work-logs', { from: '2026-09-01', to: '2026-09-30' }),
    );
    expect(cacheKey('/api/work-logs', { from: '2026-09-01' })).not.toBe(
      cacheKey('/api/work-logs', { from: '2026-10-01' }),
    );
  });
});
