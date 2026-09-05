const dateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const shortDateFormatter = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' });
const dateTimeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

function validDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value: string | null | undefined): string {
  const date = validDate(value);
  return date ? dateFormatter.format(date) : '';
}

export function formatShortDate(value: string | null | undefined): string {
  const date = validDate(value);
  return date ? shortDateFormatter.format(date) : '';
}

export function formatDateTime(value: string | null | undefined): string {
  const date = validDate(value);
  return date ? dateTimeFormatter.format(date).replace(' at ', ' · ') : '';
}

export function formatRelativeTime(value: string | null | undefined, now = Date.now()): string {
  const date = validDate(value);
  if (!date) return '';
  const seconds = Math.max(0, Math.floor((now - date.getTime()) / 1000));
  if (seconds < 45) return 'Updated just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `Updated ${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Updated ${hours} hr${hours === 1 ? '' : 's'} ago`;
  return `Updated ${formatDate(value)}`;
}

export function truncate(value: string, length = 120): string {
  const text = value.trim();
  return text.length > length ? `${text.slice(0, length - 1).trimEnd()}…` : text;
}

export function names(values: ReadonlyArray<{ name: string }> | undefined): string {
  return (
    values
      ?.map(value => value.name)
      .filter(Boolean)
      .join(', ') ?? ''
  );
}

export function jiraLabel(values: ReadonlyArray<{ key: string }> | undefined): string {
  return (
    values
      ?.map(value => value.key)
      .filter(Boolean)
      .join(', ') ?? ''
  );
}
