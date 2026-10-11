import { WorkLog } from '../../shared/models/api.models';
import { formatDate, formatDateRange } from '../../shared/utils/format';
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
  blocks?: ReportBlock[];
}
export interface ReportBlock {
  kind: 'heading' | 'text' | 'bullet' | 'quote' | 'code' | 'rule' | 'table';
  text: string;
  level?: number;
  cells?: string[];
  header?: boolean;
}
export interface WorkLogReport {
  layout?: 'jira' | 'work-log';
  title?: string;
  summary?: { label: string; value: string }[];
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
  const labeled = (label: string, value: string) => (value ? `${label}: ${value}` : '');
  return {
    layout: 'work-log',
    period: options.from + ' to ' + options.to,
    categories: options.categories.join(', '),
    generated: new Date().toLocaleDateString(),
    records: items.map(item => ({
      date: item.date ?? '',
      title: item.update || 'Work update',
      lines: [
        labeled('Activity', [item.type, item.category, item.workMode].filter(Boolean).join(' · ')),
        options.organization
          ? labeled(
              'Organization',
              [item.projects, item.companies, item.teams].flatMap(refs => refs?.map(ref => ref.name) ?? []).join(' · '),
            )
          : '',
        options.jiras && item.jiras?.length ? 'JIRAs: ' + item.jiras.map(jira => jira.key).join(', ') : '',
        options.comment && item.comment ? 'Comment: ' + item.comment : '',
        options.wentWrong && item.wentWrong ? 'Went wrong: ' + item.wentWrong : '',
        options.appraisal && item.appraisal ? 'Appraisal' : '',
      ].filter(Boolean),
    })),
  };
}
export function reportHtml(report: WorkLogReport): string {
  const range = /^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/.exec(report.period);
  const escape = (value: string) =>
    value.replace(
      /[&<>"']/g,
      character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
    );
  return (
    '<!doctype html><html><head><meta charset="utf-8"><title>Office Orbit Work Log Report</title><style>' +
    'body{font:10pt/1.55 system-ui,sans-serif;color:#23303a;background:white;margin:30px}header{border-bottom:2px solid #17633f;padding-bottom:16px;margin-bottom:22px}h1{font-size:11pt;color:#17633f;letter-spacing:1px;text-transform:uppercase}h2{font-size:24pt;margin:8px 0 12px}h3{font-size:12pt;margin:8px 0}article{break-inside:avoid;border-bottom:1px solid #dce5df;padding:12px 0}p{white-space:pre-wrap;overflow-wrap:anywhere;margin:6px 0;color:#56636c}time{display:block;font-weight:600;color:#17633f;background:#eef5f0;border-left:3px solid #17633f;padding:6px 12px;margin:12px 0}.notes{color:#23303a;background:#f5f7f8;padding:8px 12px;font-size:10pt} @page{size:A4;margin:15mm}@media print{body{margin:0}time,.notes{print-color-adjust:exact}}' +
    '</style></head><body><header><h1>Office Orbit</h1><h2>Work Log Report</h2><p>Period: ' +
    escape(range ? formatDateRange(range[1], range[2]) : report.period) +
    '</p><p>Categories: ' +
    escape(report.categories) +
    '</p><p>Generated: ' +
    escape(report.generated) +
    '</p></header>' +
    report.records
      .map(
        (record, index) =>
          '<article>' +
          (index === 0 || report.records[index - 1].date !== record.date
            ? '<time>' + escape(formatDate(record.date) || record.date || 'Undated entries') + '</time>'
            : '') +
          '<h3>' +
          escape(record.title) +
          '</h3>' +
          record.lines
            .map(
              line =>
                '<p' + (/^(Comment|Went wrong):/.test(line) ? ' class="notes"' : '') + '>' + escape(line) + '</p>',
            )
            .join('') +
          '</article>',
      )
      .join('') +
    '</body></html>'
  );
}
