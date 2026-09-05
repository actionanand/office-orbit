import { WorkLog } from '../../shared/models/api.models';
export const exportCategories = ['Office Work', 'Freelancing', 'Grooming'] as const;
export interface ExportOptions {
  from: string;
  to: string;
  categories: string[];
  comment: boolean;
  wentWrong: boolean;
  organization: boolean;
  jiras: boolean;
  appraisal: boolean;
}
export interface ReportRecord {
  date: string;
  title: string;
  lines: string[];
}
export interface WorkLogReport {
  period: string;
  categories: string;
  generated: string;
  records: ReportRecord[];
}
export function validateExport(options: ExportOptions): string {
  for (const value of [options.from, options.to]) {
    const date = new Date(value + 'T00:00:00Z');
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value)
      return 'Choose a valid start and end date.';
  }
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(options.from) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(options.to) ||
    !Number.isFinite(Date.parse(options.from)) ||
    !Number.isFinite(Date.parse(options.to)) ||
    options.from > options.to
  )
    return 'Choose a valid start and end date.';
  if (
    !options.categories.length ||
    options.categories.some(category => !exportCategories.some(value => value === category))
  )
    return 'Select at least one category.';
  return '';
}
export function reportFilename(options: Pick<ExportOptions, 'from' | 'to'>): string {
  return 'office-orbit-work-log-' + options.from + '-to-' + options.to + '.pdf';
}
export function createReport(items: WorkLog[], options: ExportOptions): WorkLogReport {
  return {
    period: options.from + ' to ' + options.to,
    categories: options.categories.join(', '),
    generated: new Date().toLocaleDateString(),
    records: items.map(item => ({
      date: item.date ?? '',
      title: item.update || 'Work update',
      lines: [
        [item.type, item.category, item.workMode].filter(Boolean).join(' · '),
        options.organization
          ? [item.projects, item.companies, item.teams].flatMap(refs => refs?.map(ref => ref.name) ?? []).join(' · ')
          : '',
        options.jiras ? (item.jiras?.map(jira => jira.key).join(', ') ?? '') : '',
        options.comment && item.comment ? 'Comment: ' + item.comment : '',
        options.wentWrong && item.wentWrong ? 'Went wrong: ' + item.wentWrong : '',
        options.appraisal && item.appraisal ? 'Appraisal' : '',
      ].filter(Boolean),
    })),
  };
}
export function reportHtml(report: WorkLogReport): string {
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
    );
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Office Orbit Work Log Report</title><style>' +
    'body{font:11pt system-ui,sans-serif;color:#182b21;background:white;margin:30px}h1{font-size:24pt;color:#17633f}h2{font-size:16pt}h3{font-size:12pt}article{break-inside:avoid;border-top:1px solid #ccc;padding:12px 0}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0}time{font-weight:600} @page{size:A4;margin:15mm}@media print{body{margin:0;color:#111}}' +
    '</style></head><body><header><h1>Office Orbit</h1><h2>Work Log Report</h2><p>Period: ' +
    escape(report.period) +
    '</p><p>Categories: ' +
    escape(report.categories) +
    '</p><p>Generated: ' +
    escape(report.generated) +
    '</p></header>' +
    report.records
      .map(
        record =>
          '<article><time>' +
          escape(record.date) +
          '</time><h3>' +
          escape(record.title) +
          '</h3>' +
          record.lines.map(line => '<p>' + escape(line) + '</p>').join('') +
          '</article>',
      )
      .join('') +
    '</body></html>'
  );
}
