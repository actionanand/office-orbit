import { inject, Service, signal } from '@angular/core';
import { CursorService } from '../../core/api/cursor.service';
import { ReportOutputService } from '../../core/platform/report-output.service';
import { WorkLog } from '../../shared/models/api.models';
import { createReport, ExportOptions, exportCategories, reportFilename, validateExport } from './work-log-report';

@Service()
export class WorkLogExportService {
  private readonly cursors = inject(CursorService);
  private readonly output = inject(ReportOutputService);
  readonly android = this.output.android;
  readonly busy = signal(false);
  readonly status = signal('');
  async records(options: ExportOptions): Promise<WorkLog[]> {
    const invalid = validateExport(options);
    if (invalid) throw new Error(invalid);
    const categories = options.categories.length === exportCategories.length ? [''] : options.categories;
    const rows = new Map<string, WorkLog>();
    for (const category of categories) {
      const data = await this.cursors.range<WorkLog>(
        '/api/work-logs',
        { from: options.from, to: options.to, category, include: 'relations' },
        count => this.status.set('Loading records... ' + (rows.size + count)),
      );
      for (const row of data) rows.set(row.id, row);
    }
    return [...rows.values()].sort((left, right) => (right.date ?? '').localeCompare(left.date ?? ''));
  }
  async run(options: ExportOptions, action: 'print' | 'pdf'): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.status.set('Preparing Work Log report...');
    try {
      const rows = await this.records(options);
      if (!rows.length) {
        this.status.set('No Work Logs match the selected export range and categories.');
        return;
      }
      const report = createReport(rows, options);
      rows.length = 0;
      this.status.set(action === 'print' ? 'Preparing print preview...' : 'Generating PDF...');
      if (action === 'print') await this.output.print(report);
      else {
        this.status.set(this.android ? 'Saving PDF...' : 'Generating PDF...');
        await this.output.pdf(report, reportFilename(options));
      }
      this.status.set(
        action === 'print'
          ? 'Print preview opened'
          : this.android
            ? 'PDF saved. Choose an app to save or share it.'
            : 'PDF downloaded',
      );
    } catch (error) {
      this.status.set(error instanceof Error ? error.message : 'Unable to export this report. Please try again.');
    } finally {
      this.busy.set(false);
    }
  }
}
