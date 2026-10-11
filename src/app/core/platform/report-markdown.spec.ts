import { markdownBlocks, markdownFieldBlocks, reportBlocksHtml } from './report-markdown';

describe('PDF Markdown blocks', () => {
  it('renders headings, inline markup, lists, links and tables without source delimiters', () => {
    const blocks = markdownBlocks(
      '## Upgrade\n\n- **Angular** migration\n- [Guide](https://example.com)\n\n| App | Version |\n| --- | --- |\n| Frontend | 42 |',
    );
    expect(blocks[0]).toMatchObject({ kind: 'heading', text: 'Upgrade', level: 2 });
    expect(blocks.some(block => block.kind === 'bullet' && block.text === '• Angular migration')).toBe(true);
    expect(blocks.find(block => block.text === '• Guide')?.runs).toContainEqual({
      text: 'Guide',
      href: 'https://example.com',
    });
    expect(blocks.filter(block => block.kind === 'table').map(block => block.cells)).toEqual([
      ['App', 'Version'],
      ['Frontend', '42'],
    ]);
    expect(JSON.stringify(blocks)).not.toMatch(/\*\*|##|\| ---/);
  });
  it('retains inline formatting in paragraphs, nested lists and table cells', () => {
    const blocks = markdownBlocks(
      '**Bold** *italic* ~~removed~~ `code`\n\n1. Parent\n   - **Child**\n\n| Link |\n| --- |\n| [Guide](https://example.com) |',
    );
    expect(blocks[0].runs).toEqual(
      expect.arrayContaining([
        { text: 'Bold', bold: true },
        { text: 'italic', italic: true },
        { text: 'removed', strike: true },
        { text: 'code', code: true },
      ]),
    );
    expect(blocks.find(block => block.text === '• Child')).toMatchObject({ kind: 'bullet', level: 1 });
    expect(blocks.at(-1)?.cellRuns?.[0]).toEqual([{ text: 'Guide', href: 'https://example.com' }]);
  });
  it('formats field content and escapes HTML without activating unsafe links', () => {
    const blocks = markdownFieldBlocks(
      'Comment: ## Review\n\n[Guide](https://example.com) and [unsafe](javascript:alert)\n\n<script>alert(1)</script>',
    );
    expect(blocks[0].text).toBe('Comment');
    expect(blocks[1]).toMatchObject({ kind: 'heading', text: 'Review' });
    const html = reportBlocksHtml(blocks);
    expect(html).toContain('<a href="https://example.com">Guide</a>');
    expect(html).not.toContain('javascript:');
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('[Guide]');
  });
  it('preserves reference-style links inside lists and quotations', () => {
    const blocks = markdownBlocks('- [Guide][docs]\n\n> [Quoted guide][docs]\n\n[docs]: https://example.com/docs');
    expect(blocks.filter(block => block.runs?.some(run => run.href === 'https://example.com/docs'))).toHaveLength(2);
  });
  it('preserves code, task state, and quotation content', () => {
    const blocks = markdownBlocks('> A quoted reason\n\n- [x] Done\n\n```ts\nconst value = 42;\n```');
    expect(blocks.some(block => block.kind === 'quote' && block.text === 'A quoted reason')).toBe(true);
    expect(blocks.some(block => block.text.includes('[x] Done'))).toBe(true);
    expect(blocks.some(block => block.kind === 'code' && block.text === 'const value = 42;')).toBe(true);
  });
});
