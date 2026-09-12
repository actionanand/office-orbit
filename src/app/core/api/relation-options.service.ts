import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Service } from '@angular/core';
import { defer, firstValueFrom, timeout } from 'rxjs';
import { environment } from '../../../environments/environment';
import { RelationOption } from '../../shared/models/api.models';
import { DataCacheService } from '../cache/data-cache.service';

interface RelationPage {
  data: unknown[];
  hasMore: boolean;
  nextCursor: string | null;
}

@Service()
export class RelationOptionsService {
  private readonly http = inject(HttpClient);
  private readonly cache = inject(DataCacheService);

  load(path: string, refresh = false) {
    return this.cache.load(`relations:${path}`, () => defer(() => this.loadAll(path)), refresh);
  }

  private async loadAll(path: string): Promise<RelationOption[]> {
    const records: unknown[] = [];
    const seen = new Set<string>();
    let cursor: string | null = null;
    do {
      let params = new HttpParams().set('pageSize', '100');
      if (cursor) params = params.set('cursor', cursor);
      const page = await firstValueFrom(
        this.http.get<RelationPage>(environment.apiBaseUrl + path, { params }).pipe(timeout(15000)),
      );
      records.push(...page.data);
      if (!page.hasMore) break;
      cursor = page.nextCursor;
      if (!cursor || seen.has(cursor)) throw new Error('Unable to load all relation options.');
      seen.add(cursor);
    } while (cursor);
    return records.flatMap(record => this.option(record));
  }

  private option(value: unknown): RelationOption[] {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return [];
    const record = value as Record<string, unknown>;
    if (typeof record['id'] !== 'string') return [];
    const label = ['jiraKey', 'company', 'team', 'project', 'name']
      .map(key => record[key])
      .find(entry => typeof entry === 'string' && entry.trim());
    if (typeof label !== 'string') return [];
    return [
      {
        id: record['id'],
        label,
        ...(typeof record['summary'] === 'string' && record['summary'] ? { description: record['summary'] } : {}),
      },
    ];
  }
}
