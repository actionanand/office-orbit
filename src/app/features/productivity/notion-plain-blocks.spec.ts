import { renderMarkdown } from './markdown-viewer.component';
import { normalizeNotionMarkdown } from './notion-markdown-normalizer';

const EMOJI = [
  'Markdown documents can include Unicode emoji directly.',
  '✅ Completed',
  '❌ Incorrect',
  '⚠️ Warning',
  '💡 Tip',
  '📚 Study',
  '🧠 Practice',
  '🎯 Goal',
  '⭐ Favourite',
];
const SPECIAL = [
  'Copyright: ©',
  'Registered trademark: ®',
  'Trademark: ™',
  'Degree: 90°',
  'Plus/minus: ±',
  'Multiplication: ×',
  'Division: ÷',
  'Less than or equal: ≤',
  'Greater than or equal: ≥',
  'Approximately equal: ≈',
  'Infinity: ∞',
];

describe('Notion plain text blocks', () => {
  it('renders the exact emoji and special-character entries on separate lines', () => {
    const item = Object.freeze({
      markdown:
        '# 25. Emoji\n\n' + EMOJI.join('\n') + '\n-----------\n\n# 26. Special Characters\n\n' + SPECIAL.join('\n'),
    });
    const source = item.markdown;
    const html = renderMarkdown(source).html;
    const document = new DOMParser().parseFromString(html, 'text/html');
    expect(document.querySelectorAll('h1')).toHaveLength(2);
    expect(document.querySelector('h2, ul, ol')).toBeNull();
    expect(document.querySelectorAll('hr')).toHaveLength(1);
    expect(document.querySelectorAll('br')).toHaveLength(18);
    for (const entry of [...EMOJI, ...SPECIAL]) expect(document.body.textContent).toContain(entry);
    expect(item.markdown).toBe(source);
    expect(normalizeNotionMarkdown(normalizeNotionMarkdown(source))).toBe(normalizeNotionMarkdown(source));
  });

  it('preserves lists, lazy continuations, quotes, tables, headings and HTML containers', () => {
    for (const source of [
      '- Parent\n  - Child\n- [x] Done\n- [ ] Open',
      '1. First\nlazy continuation\nanother continuation\n2. Second',
      '> Quote\nlazy continuation\n> > Nested',
      '| Name | Value |\n| --- | --- |\n| One | Two |',
      'Heading\n---\n\n## Second\n\n---',
      '[Docs][ref]\n\n[ref]: https://example.com',
      '<details>\n<summary>Title</summary>\n\nFirst\nSecond\n\n</details>',
      '```text\nFirst\nSecond\n```',
      '~~~mermaid\nflowchart TD\nA --> B\n~~~',
    ])
      expect(normalizeNotionMarkdown(source)).toBe(source);
  });

  it('preserves math, inline code and explicit hard breaks', () => {
    for (const source of [
      'First  \nSecond',
      'First\\\nSecond',
      '$$\nx = 1\ny = 2\n$$',
      'Value $x$\nValue $y$',
      '`one`\n`two`',
    ]) {
      expect(normalizeNotionMarkdown(source)).toBe(source);
    }
    const result = renderMarkdown('$$\nx = 1\n$$\n## After math\n\nFirst\nSecond');
    expect(result.html).toContain('<h2>After math</h2>');
    expect(result.formulas).toEqual([{ value: 'x = 1', display: true }]);
    expect(result.html).toContain('First<br>');
  });

  it('retains definition lists and Notion table formatting', () => {
    const html = renderMarkdown(
      'Term\n: Definition\n\n<table header-row="true"><tr><td>Name</td></tr><tr><td>**Value**</td></tr></table>',
    ).html;
    expect(html).toContain('<dt>Term</dt>');
    expect(html).toContain('<dd>Definition</dd>');
    expect(html).toContain('<strong>Value</strong>');
    expect(html).toContain('<table>');
  });
});
