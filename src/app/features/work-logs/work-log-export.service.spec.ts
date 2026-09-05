import { TestBed } from '@angular/core/testing';
import { CursorService } from '../../core/api/cursor.service';
import { ReportOutputService } from '../../core/platform/report-output.service';
import { workLogFixture } from '../../shared/models/work-log.fixture';
import { WorkLogExportService } from './work-log-export.service';
import {
  createReport,
  ExportOptions,
  exportCategories,
  reportFilename,
  reportHtml,
  validateExport,
} from './work-log-report';
const options: ExportOptions = {
  from: '2026-09-01',
  to: '2026-09-30',
  categories: ['Office Work'],
  comment: true,
  wentWrong: false,
  organization: true,
  jiras: true,
  appraisal: true,
};
describe('Work Log reports', () => {
  it('validates bounded dates and at least one category', () => {
    expect(validateExport(options)).toBe('');
    expect(validateExport({ ...options, from: '2026-10-01' })).not.toBe('');
    expect(validateExport({ ...options, categories: [] })).not.toBe('');
    expect(reportFilename(options)).toBe('office-orbit-work-log-2026-09-01-to-2026-09-30.pdf');
  });
  it('queries selected categories, deduplicates and sorts; all categories omit the category filter', async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce([workLogFixture('a', { date: '2026-09-02' })])
      .mockResolvedValueOnce([workLogFixture('a'), workLogFixture('b', { date: '2026-09-06' })])
      .mockResolvedValue([]);
    TestBed.configureTestingModule({
      providers: [
        { provide: CursorService, useValue: { range } },
        { provide: ReportOutputService, useValue: { android: false } },
      ],
    });
    const service = TestBed.inject(WorkLogExportService);
    const records = await service.records({ ...options, categories: ['Office Work', 'Grooming'] });
    expect(range.mock.calls.map(call => call[1].category)).toEqual(['Office Work', 'Grooming']);
    expect(records.map(row => row.id)).toEqual(['b', 'a']);
    await service.records({ ...options, categories: [...exportCategories] });
    expect(range.mock.calls[2][1].category).toBe('');
  });
  it('does not generate an empty PDF', async () => {
    const pdf = vi.fn();
    TestBed.configureTestingModule({
      providers: [
        { provide: CursorService, useValue: { range: vi.fn().mockResolvedValue([]) } },
        { provide: ReportOutputService, useValue: { pdf, android: false } },
      ],
    });
    const service = TestBed.inject(WorkLogExportService);
    await service.run(options, 'pdf');
    expect(pdf).not.toHaveBeenCalled();
    expect(service.status()).toContain('No Work Logs match');
  });
  it('prints a standalone escaped document containing selected records and no internal fields', () => {
    const html = reportHtml(
      createReport(
        [
          workLogFixture('private-id', {
            update: '<b>Review</b>',
            comment: 'Selected comment',
            wentWrong: 'Omitted content',
          }),
        ],
        options,
      ),
    );
    expect(html).toContain('&lt;b&gt;Review&lt;/b&gt;');
    expect(html).toContain('Selected comment');
    for (const hidden of [
      'private-id',
      'private-created',
      'private-edited',
      'Omitted content',
      'ion-content',
      'sidebar',
    ])
      expect(html).not.toContain(hidden);
    expect(html).toContain('break-inside:avoid');
  });
});
