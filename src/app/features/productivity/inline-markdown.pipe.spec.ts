import { renderInlineMarkdown } from './markdown-viewer.component';

describe('renderInlineMarkdown', () => {
  it('renders inline emphasis and code without creating block elements', () => {
    const value = renderInlineMarkdown('Fix **Angular** *deployment* `package.json`');

    expect(value).toContain('<strong>Angular</strong>');
    expect(value).toContain('<em>deployment</em>');
    expect(value).toContain('<code>package.json</code>');
    expect(value).not.toMatch(/<(?:p|ul|ol|li|h[1-6]|table|pre)\b/);
  });

  it('keeps list syntax inline instead of turning it into a list block', () => {
    const value = renderInlineMarkdown('- first\n- second');

    expect(value).toContain('- first');
    expect(value).toContain('- second');
    expect(value).not.toContain('<ul>');
  });

  it('does not emit unsafe Markdown links', () => {
    expect(renderInlineMarkdown('[Unsafe](javascript:alert(1))')).not.toContain('href=');
  });
});
