import { inject, Service } from '@angular/core';
import { defer } from 'rxjs';
import { CursorService } from '../../core/api/cursor.service';
import { DataCacheService } from '../../core/cache/data-cache.service';
import { WorkLog } from '../../shared/models/api.models';
import { ChartValue } from '../../shared/components/bar-chart.component';

export function aggregateWork(items: WorkLog[]): {
  weeks: ChartValue[];
  categories: ChartValue[];
  types: ChartValue[];
} {
  const count = (key: (item: WorkLog) => string) => {
    const values = new Map<string, number>();
    for (const item of items) {
      const label = key(item);
      values.set(label, (values.get(label) ?? 0) + 1);
    }
    return [...values].map(([label, value]) => ({ label, value }));
  };
  return {
    weeks: count(item => {
      if (!item.date) return 'Undated';
      const date = new Date(item.date + 'T12:00:00');
      date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
      return (
        date.getFullYear() +
        '-' +
        String(date.getMonth() + 1).padStart(2, '0') +
        '-' +
        String(date.getDate()).padStart(2, '0')
      );
    }).sort((a, b) => a.label.localeCompare(b.label)),
    categories: count(item => item.category || 'Uncategorized'),
    types: count(item => item.type || 'Unspecified'),
  };
}
@Service()
export class AnalyticsService {
  private readonly cache = inject(DataCacheService);
  private readonly cursors = inject(CursorService);
  load(from: string, to: string, refresh = false) {
    return this.cache.load(
      'analytics:work-activity:' + from + ':' + to + '#',
      () =>
        defer(async () => {
          const rows = await this.cursors.range<WorkLog>('/api/work-logs', { from, to });
          return { ...aggregateWork(rows), count: rows.length, updatedAt: Date.now() };
        }),
      refresh,
    );
  }
}
