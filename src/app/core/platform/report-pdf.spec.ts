import { reportPdf } from './report-pdf';

describe('selectable web PDF output', () => {
  it('writes report content as PDF text instead of a page-sized image', async () => {
    const blob = await reportPdf({
      period: 'September 2026',
      categories: 'Office Work',
      generated: '2026-09-06',
      records: [{ date: '2026-09-05', title: 'Review', lines: ['Selectable meeting notes'] }],
    });
    const content = new TextDecoder().decode(await blob.arrayBuffer());
    expect(content).toContain('(Selectable meeting notes) Tj');
    expect(content).toContain('/BaseFont /Helvetica');
    expect(content).not.toContain('/Subtype /Image');
  });
});
