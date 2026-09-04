import { safeUrl } from '../../core/platform/links.service';

export function spilloverLabel(count: number): string {
  if (!Number.isFinite(count) || count <= 0) return '';
  return count === 1 ? 'Spilled once' : `Spilled ${Math.floor(count)} times`;
}

export function jiraExternalUrl(baseUrl: string | null | undefined, jiraKey: string): string | null {
  const safeBase = safeUrl(baseUrl);
  const key = jiraKey.trim();
  if (!safeBase || !key) return null;
  const url = new URL(safeBase);
  url.pathname = `${url.pathname.replace(/\/+$/, '')}/browse/${encodeURIComponent(key)}`;
  url.search = '';
  url.hash = '';
  return url.href;
}
