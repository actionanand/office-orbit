import { markdownBlocks } from './report-markdown';

describe('PDF Markdown blocks', () => {
  it('renders headings, inline markup, lists, links and tables without source delimiters', () => {
    const blocks = markdownBlocks(
      '## Upgrade\n\n- **Angular** migration\n- [Guide](https://example.com)\n\n| App | Version |\n| --- | --- |\n| Frontend | 42 |',
    );
    expect(blocks[0]).toEqual({ kind: 'heading', text: 'Upgrade', level: 2 });
    expect(blocks.some(block => block.kind === 'bullet' && block.text === '• Angular migration')).toBe(true);
    expect(blocks.some(block => block.text.includes('Guide (https://example.com)'))).toBe(true);
    expect(blocks.filter(block => block.kind === 'table').map(block => block.cells)).toEqual([
      ['App', 'Version'],
      ['Frontend', '42'],
    ]);
    expect(JSON.stringify(blocks)).not.toMatch(/\*\*|##|\| ---/);
  });
  it('preserves code, task state, and quotation content', () => {
    const blocks = markdownBlocks('> A quoted reason\n\n- [x] Done\n\n```ts\nconst value = 42;\n```');
    expect(blocks.some(block => block.kind === 'quote' && block.text === 'A quoted reason')).toBe(true);
    expect(blocks.some(block => block.text.includes('[x] Done'))).toBe(true);
    expect(blocks.some(block => block.kind === 'code' && block.text === 'const value = 42;')).toBe(true);
  });
});
