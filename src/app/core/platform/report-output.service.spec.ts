import { TestBed } from '@angular/core/testing';
import { PlatformService } from './platform.service';
import { NATIVE_REPORT_EXPORTER, ReportOutputService } from './report-output.service';

const native = { exportPdf: vi.fn().mockResolvedValue({ path: '/cache/exports/report.pdf' }) };

describe('Report output platform boundary', () => {
  afterEach(() => {
    native.exportPdf.mockClear();
    TestBed.resetTestingModule();
  });

  it('writes through the Office Pulse native export pattern on Android', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { android: true } },
        { provide: NATIVE_REPORT_EXPORTER, useValue: native },
      ],
    });
    await TestBed.inject(ReportOutputService).pdf(
      {
        period: 'September',
        categories: 'Office Work',
        generated: '2026-09-05',
        records: [{ date: '2026-09-05', title: 'Review', lines: ['Meeting'] }],
      },
      'report.pdf',
    );
    expect(native.exportPdf).toHaveBeenCalledWith(expect.objectContaining({ filename: 'report.pdf' }));
    const payload = JSON.parse(native.exportPdf.mock.calls[0][0].content) as {
      sections: { rows: { cells: string[] }[] }[];
    };
    expect(payload.sections[0].rows[0].cells[0]).toContain('Review');
  });
  it('downloads a real PDF Blob with the selected filename on Web', async () => {
    TestBed.configureTestingModule({
      providers: [
        { provide: PlatformService, useValue: { android: false } },
        { provide: NATIVE_REPORT_EXPORTER, useValue: native },
      ],
    });
    const create = vi.fn().mockReturnValue('blob:report');
    vi.stubGlobal(
      'URL',
      class extends URL {
        static override createObjectURL = create;
        static override revokeObjectURL = vi.fn();
      },
    );
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const blob = new Blob(['%PDF-1.4'], { type: 'application/pdf' });
    TestBed.inject(ReportOutputService).download(blob, 'report.pdf');
    expect(create).toHaveBeenCalledWith(blob);
    expect(click).toHaveBeenCalledOnce();
    click.mockRestore();
    vi.unstubAllGlobals();
  });
});
