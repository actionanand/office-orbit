import { prepareMarkdown, renderMarkdown, safeMarkdownUrl } from './markdown-viewer.component';
import { MAX_MARKDOWN_BYTES, validateMarkdownFile } from './reference-library.page';
import { routes } from './productivity.routes';

describe('Productivity feature', () => {
  it('provides every child route and the default To Do redirect', () => {
    expect(routes[0]).toMatchObject({ path: '', redirectTo: 'todos' });
    expect(routes.map(route => route.path)).toEqual([
      '',
      'todos',
      'tasks',
      'memos',
      'memos/:pageId',
      'reference-library',
      'reference-library/:pageId',
    ]);
  });

  it('renders standard Markdown while preserving fenced code as code', () => {
    const result = renderMarkdown('# Heading\n\n- one\n- two\n\n```html\n<script>x</script>\n```');
    expect(result.html).toContain('<h1>Heading</h1>');
    expect(result.html).toContain('<li>one</li>');
    expect(result.html).toContain('&lt;script&gt;x&lt;/script&gt;');
  });

  it('renders inline Markdown and rejects unsafe link schemes', () => {
    expect(renderMarkdown('Use **bold**, `code`, and [docs](https://example.com).').html).toContain(
      '<strong>bold</strong>',
    );
    expect(safeMarkdownUrl('javascript:alert(1)')).toBeNull();
  });

  it('recognizes Mermaid and math without interpreting code as math', () => {
    const result = renderMarkdown('```mermaid\nflowchart LR\nA --> B\n```\n\n$E = mc^2$\n\n$$\nx^2\n$$\n\n`$10`');
    expect(result.html).toContain('language-mermaid');
    expect(result.html).toContain('markdown-math-0');
    expect(result.html).toContain('markdown-math-1');
    expect(result.formulas).toEqual([
      { value: 'E = mc^2', display: false },
      { value: 'x^2', display: true },
    ]);
    expect(prepareMarkdown("```ts\nconst price = '$10';\n```").formulas).toEqual([]);
  });

  it('renders GFM tables, task states, rules, and supported HTML safely', () => {
    const markdown = [
      '---',
      '',
      '- [x] Complete',
      '- [ ] Pending',
      '',
      '| Name | Score |',
      '|---|---:|',
      '| Orbit | 10 |',
      '',
      'Water is H&lt;sub&gt;2&lt;/sub&gt;O.',
      '',
      '&lt;details open&gt;&lt;summary&gt;Answer&lt;/summary&gt;Visible&lt;/details&gt;',
    ].join('\n');
    const result = renderMarkdown(markdown);

    expect(result.html).toContain('<hr>');
    expect(result.html).toContain('<table>');
    expect(result.html).toContain('class="markdown-checkbox checked"');
    expect(result.html).not.toContain('<input');
    expect(result.html).toContain('H<sub>2</sub>O');
    expect(result.html).toContain('<details open>');
  });

  it('keeps block math inside nested Markdown containers', () => {
    const quote = renderMarkdown('> Formula:\n>\n> $$\n> x^2\n> $$').html;
    const list = renderMarkdown('1. Formula:\n\n   $$\n   x^2\n   $$\n\n2. Next').html;

    expect(quote).toContain('<blockquote>');
    expect(quote).toContain('markdown-math-block');
    expect(list).toContain('<ol>');
    expect(list).toContain('<p>Next</p>');
  });

  it('renders footnotes and definition lists as structured content', () => {
    const result = renderMarkdown(
      'A fraction has parts.[^fraction]\n\n[^fraction]: One or more equal parts.\n\nTerm\n: Definition',
    );

    expect(result.html).toContain('class="markdown-footnote-ref"');
    expect(result.html).toContain('class="markdown-footnotes"');
    expect(result.html).toContain('<dl class="markdown-definition-list">');
    expect(result.html).not.toContain('[^fraction]');
  });

  it('validates Markdown imports before upload', () => {
    expect(validateMarkdownFile(null)).toContain('Choose');
    expect(validateMarkdownFile(new File([], 'empty.md'))).toContain('non-empty');
    expect(validateMarkdownFile(new File(['text'], 'notes.txt'))).toContain('.md');
    expect(validateMarkdownFile(new File([new Uint8Array(MAX_MARKDOWN_BYTES + 1)], 'large.md'))).toContain('4.5 MB');
    expect(validateMarkdownFile(new File(['# Notes'], 'notes.markdown'))).toBe('');
  });
});
