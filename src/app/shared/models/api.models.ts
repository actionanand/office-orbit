export type ApiItem = Readonly<Record<string, unknown>>;
export interface ListResponse<T> {
  data: T[];
  count: number;
  hasMore: boolean;
  nextCursor: string | null;
}
export interface ResourceView {
  label: string;
  path: string;
}

export function itemTitle(item: ApiItem): string {
  for (const key of ['summary', 'title', 'name', 'jiraKey', 'key', 'version']) {
    const value = item[key];
    if (typeof value === 'string' && value.trim()) return value;
  }
  return 'Work item';
}
export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'string' || typeof value === 'number') return String(value);
  if (Array.isArray(value)) return value.map(displayValue).join(', ');
  if (typeof value === 'object')
    return (
      Object.values(value)
        .filter(entry => typeof entry === 'string' || typeof entry === 'number')
        .map(String)
        .join(' · ') || 'Available'
    );
  return '—';
}
export function humanize(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[-_]/g, ' ')
    .replace(/^./, value => value.toUpperCase());
}
