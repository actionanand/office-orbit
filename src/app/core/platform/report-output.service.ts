import { InjectionToken, inject, Service } from '@angular/core';
import { registerPlugin } from '@capacitor/core';
import { PlatformService } from './platform.service';
import { reportHtml, WorkLogReport } from '../../features/work-logs/work-log-report';
import { reportPdf } from './report-pdf';

interface NativeReportExporter {
  exportPdf(options: { filename: string; content: string; title: string }): Promise<{ path: string }>;
}

export const NATIVE_REPORT_EXPORTER = new InjectionToken<NativeReportExporter>('Office Orbit native report exporter', {
  providedIn: 'root',
  factory: () => registerPlugin<NativeReportExporter>('OfficeOrbitExport'),
});

@Service()
export class ReportOutputService {
  private readonly platform = inject(PlatformService);
  private readonly nativeExporter = inject(NATIVE_REPORT_EXPORTER);
  readonly android = this.platform.android;
  async print(report: WorkLogReport): Promise<void> {
    // A separate document bypasses Ionic Shadow DOM scrolling/fixed-height ancestors.
    const frame = document.createElement('iframe');
    frame.title = 'Work Log printable report';
    frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0';
    document.body.appendChild(frame);
    try {
      await new Promise<void>((resolve, reject) => {
        frame.onload = () => resolve();
        frame.onerror = () => reject(new Error('Unable to prepare print preview.'));
        frame.srcdoc = reportHtml(report);
      });
      const target = frame.contentWindow;
      if (!target) throw new Error('Unable to prepare print preview.');
      await frame.contentDocument?.fonts.ready;
      await new Promise<void>(resolve =>
        target.requestAnimationFrame(() => target.requestAnimationFrame(() => resolve())),
      );
      target.addEventListener('afterprint', () => frame.remove(), { once: true });
      target.focus();
      target.print();
      // Keep the printable document alive while the browser owns print preview.
      window.setTimeout(() => frame.remove(), 300000);
    } catch (error) {
      frame.remove();
      throw error;
    }
  }
  async pdf(report: WorkLogReport, filename: string): Promise<void> {
    if (this.android) {
      const sections = new Map<string, { title: string; rows: { state: string; cells: string[] }[] }>();
      for (const record of report.records) {
        const section = sections.get(record.date) ?? { title: record.date, rows: [] };
        section.rows.push({ state: 'normal', cells: [[record.title, ...record.lines].join('\n')] });
        sections.set(record.date, section);
      }
      await this.nativeExporter.exportPdf({
        filename,
        title: 'Office Orbit Work Log Report',
        content: JSON.stringify({
          title: 'Office Orbit · Work Log Report',
          generatedOn: report.generated,
          summary: [
            { label: 'Period', value: report.period },
            { label: 'Categories', value: report.categories },
          ],
          headers: ['Work Log'],
          sections: [...sections.values()],
        }),
      });
    } else {
      const blob = await reportPdf(report);
      this.download(blob, filename);
    }
  }
  download(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
