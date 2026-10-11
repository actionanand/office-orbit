import { reportPdf } from './report-pdf';

describe('selectable web PDF output', () => {
  it('groups Work Log entries by readable date and styles notes without dropping content', async () => {
    const blob = await reportPdf({
      layout: 'work-log',
      period: '2026-10-01 to 2026-10-31',
      categories: 'Office Work',
      generated: 'Oct 11, 2026',
      records: [
        { date: '2026-10-08', title: 'Update bumble bee script', lines: ['Work: Office Work', 'JIRAs: LSC-86139'] },
        {
          date: '2026-10-08',
          title: 'Review deployment',
          lines: ['Comment: Selected note', 'Went wrong: Dependency delayed'],
        },
        { date: '', title: 'Undated work', lines: [] },
      ],
    });
    const content = await blob.text();
    expect(content.match(/\(Oct 8, 2026\)/g)).toHaveLength(1);
    expect(content).toContain('(3 entries  |  1 day with activity)');
    expect(content).toContain('(Undated entries)');
    expect(content).toContain('(Selected note)');
    expect(content).toContain('(Dependency delayed)');
    expect(content).not.toContain('JIRA DETAIL REPORT');
  });
  it('groups JIRA sections and retains long narratives across page breaks', async () => {
    const blob = await reportPdf({
      layout: 'jira',
      title: 'JIRA Detail',
      summary: [{ label: 'JIRA', value: 'LSC-123' }],
      period: '',
      categories: '',
      generated: '2026-10-11',
      records: [
        { date: 'Overview', title: 'Migration', lines: ['Status: Done'] },
        {
          date: 'Description',
          title: '',
          lines: [],
          blocks: [
            { kind: 'heading', text: 'Angular Upgrade', level: 2 },
            { kind: 'bullet', text: '• Angular 9 → 18' },
          ],
        },
        { date: 'Work history', title: 'Review', lines: ['Long narrative. '.repeat(1000), 'Final record retained'] },
      ],
    });
    const content = await blob.text();
    expect(content).toContain('(Angular Upgrade)');
    expect(content).toContain('Angular 9 -> 18');
    expect(content).toContain('(Work history \\(continued\\))');
    expect(content).toContain('(Final record retained)');
    expect(Number(content.match(/\/Type \/Pages \/Count (\d+)/)?.[1])).toBeGreaterThan(1);
    expect(content).not.toContain('/Subtype /Image');
  });
  it('writes report content as PDF text instead of a page-sized image', async () => {
    const blob = await reportPdf({
      period: 'September 2026',
      categories: 'Office Work',
      generated: '2026-09-06',
      records: [{ date: '2026-09-05', title: 'Review', lines: ['Selectable meeting notes'] }],
    });
    const content = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(reader.error ?? new Error('Unable to read generated PDF.'));
      reader.onload = () => resolve(String(reader.result));
      reader.readAsText(blob);
    });
    expect(content).toContain('(Selectable meeting notes) Tj');
    expect(content).toContain('/BaseFont /Helvetica');
    expect(content).not.toContain('/Subtype /Image');
  });
});
