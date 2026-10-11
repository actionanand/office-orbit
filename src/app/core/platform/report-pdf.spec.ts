import { reportPdf } from './report-pdf';
import { reportHtml, WorkLogReport } from '../../features/work-logs/work-log-report';

describe('selectable web PDF output', () => {
  for (const layout of ['jira', 'work-log', undefined] as const) {
    it(`renders Markdown as styled text and clickable links for ${layout ?? 'default'} exports`, async () => {
      const report: WorkLogReport = {
        layout,
        period: 'October 2026',
        categories: 'Office Work',
        generated: '2026-10-11',
        records: [
          {
            date: '2026-10-08',
            title: '**Deployment** update',
            lines: [
              'Comment: ## Review\n\n**Bold** *italic* ~~old~~ `code` and [link text](https://google.com)\n\n1. First\n2. Second\n\n| Guide |\n| --- |\n| [Reference](https://example.com) |\n\n[unsafe](javascript:alert)',
            ],
          },
        ],
      };
      const content = await (await reportPdf(report)).text();
      expect(content).toContain('/Subtype /Link');
      expect(content).toContain('/URI <68747470733a2f2f676f6f676c652e636f6d>');
      expect(content).toContain('(link text)');
      expect(content).toMatch(/\/F2 [\d.]+ Tf[^\n]+\(Bold\)/);
      expect(content).toMatch(/\/F4 [\d.]+ Tf[^\n]+\(italic\)/);
      expect(content).toMatch(/\/F3 [\d.]+ Tf[^\n]+\(code\)/);
      expect(content).toContain('(1.)');
      expect(content).toContain('(First)');
      expect(content).toContain('(Reference)');
      expect(content).not.toMatch(/\[link text\]|\*\*Deployment\*\*|## Review|javascript:/);
      const html = reportHtml(report);
      expect(html).toContain('<strong>Deployment</strong>');
      expect(html).toContain('<a href="https://google.com">link text</a>');
      expect(html).not.toMatch(/\[link text\]|javascript:/);
    });
  }
  it('draws real unordered bullets and keeps wrapped list text at one hanging indent', async () => {
    const content = await (
      await reportPdf({
        layout: 'jira',
        period: '',
        categories: '',
        generated: '',
        records: [
          { date: 'Description', title: '', lines: ['- ' + 'Wrapped list content '.repeat(30) + '\n  - Nested item'] },
        ],
      })
    ).text();
    expect(content.match(/\(\\225\) Tj/g)).toHaveLength(2);
    expect(content).not.toContain('(- Wrapped');
    const lines = content.split('\n').filter(line => line.includes('Wrapped list content'));
    expect(lines.length).toBeGreaterThan(1);
    const positions = lines.map(line => line.match(/1 0 0 1 ([\d.]+) [\d.]+ Tm/)?.[1]);
    expect(new Set(positions).size).toBe(1);
    const nested = content.split('\n').find(line => line.includes('(Nested item)'));
    expect(Number(nested?.match(/1 0 0 1 ([\d.]+) [\d.]+ Tm/)?.[1])).toBeGreaterThan(Number(positions[0]));
  });
  it('retains link annotations when a long label wraps across lines and pages', async () => {
    const content = await (
      await reportPdf({
        layout: 'work-log',
        period: '',
        categories: '',
        generated: '',
        records: [
          {
            date: '2026-10-08',
            title: 'Long link',
            lines: ['[' + 'Readable linked text '.repeat(700) + '](https://example.com)'],
          },
        ],
      })
    ).text();
    expect(Number(content.match(/\/Type \/Pages \/Count (\d+)/)?.[1])).toBeGreaterThan(1);
    expect(content.match(/\/Subtype \/Link/g)?.length).toBeGreaterThan(10);
    expect(content).not.toContain('[Readable');
  });
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
