import { renderMarkdown } from './markdown-viewer.component';
import { normalizeNotionMarkdown } from './notion-markdown-normalizer';

const STANDARD_MARKDOWN_FIXTURE = `# Standard Markdown

- Parent
  - Child

> Quote

| Feature | Value |
|---|---|
| Math | $E = mc^2$ |

\`\`\`typescript
const value: number = 1;
\`\`\`

\`\`\`mermaid
flowchart LR
  A --> B
\`\`\`

H<sub>2</sub>O

Term
: Definition

Reference.[^one]

[^one]: Footnote text.`;

const NOTION_MARKDOWN_FIXTURE = `#### Heading normalized by Notion

<table header-row="true">
<tr>
<td>Feature</td>
<td>Description</td>
<td>Status</td>
</tr>
<tr>
<td>**Study Notes**</td>
<td>*Read* \`Markdown\` lessons</td>
<td>✅ Available</td>
</tr>
<tr>
<td>~~Old Notes~~</td>
<td>$A = \\frac{1}{2}bh$</td>
<td></td>
</tr>
</table>

* Science
\t* Physics
\t\t* Motion

> Level 1 quote
>
> \\> Level 2 quote
> \\>
> \\>\\> Level 3 quote

H\\<sub\\>2\\</sub\\>O and \\<mark\\>important\\</mark\\>.

1. Install dependencies:
   \`\`\`bash
npm install
   \`\`\`

Fractions are measurable. [\\[1\\]](1)

[\\[1\\]](1): A fraction is one or more equal parts.`;

describe('Notion Markdown normalizer', () => {
  it('renders the raw API description as a paragraph followed by a rule and H1', () => {
    const source =
      '# Complete Markdown Feature Demo\nThis article demonstrates common **Markdown**, **GitHub-Flavored Markdown (GFM)**, **KaTeX**, and **Mermaid** syntax.\n---\n# 1. Headings';
    const document = new DOMParser().parseFromString(renderMarkdown(source).html, 'text/html');
    expect([...document.body.children].map(node => node.tagName)).toEqual(['H1', 'P', 'HR', 'H1']);
    expect(document.querySelector('p strong')?.textContent).toBe('Markdown');
    expect(document.querySelector('h2')).toBeNull();
    expect(document.querySelector('h1:last-child')?.textContent).toBe('1. Headings');
    expect(normalizeNotionMarkdown(source)).toContain('\n\n---\n\n');
  });

  it('disambiguates packed separators and preserves conventional Setext and explicit headings', () => {
    for (const source of [
      'Paragraph\n---\n# Heading',
      'Paragraph\n---\nAnother paragraph',
      '#### Heading\n---\n# Next section',
    ]) {
      expect(renderMarkdown(source).html).toContain('<hr>');
      expect(normalizeNotionMarkdown(normalizeNotionMarkdown(source))).toBe(normalizeNotionMarkdown(source));
    }
    for (const source of ['Heading\n---', 'Heading\n---\n\nParagraph', 'Heading\n===\n\nParagraph', '## Explicit H2']) {
      expect(normalizeNotionMarkdown(source)).toBe(source);
    }
  });

  it('renders all thematic break spellings and a separator after Heading Level 6', () => {
    const source =
      '#### Heading Level 6\n---\n# 10. Horizontal Rules\nThree hyphens:\n---\nThree asterisks:\n***\nThree underscores:\n___';
    const document = new DOMParser().parseFromString(renderMarkdown(source).html, 'text/html');
    expect(document.querySelectorAll('hr')).toHaveLength(4);
    expect(document.querySelectorAll('p')).toHaveLength(3);
    expect(document.querySelector('h2')).toBeNull();
  });

  it('preserves YAML, mixed fence markers, longer fences and unclosed code samples', () => {
    for (const source of [
      '```yaml\n---\nname: demo\n---\n````',
      '~~~text\nParagraph\n---\n# Heading\n~~~',
      '````text\n```\nParagraph\n---\n# Heading\n````',
      '```text\n~~~\nParagraph\n---\n# Heading',
    ]) {
      expect(normalizeNotionMarkdown(source)).toBe(source);
      expect(renderMarkdown(source).html).not.toContain('<hr>');
    }
  });

  it('retains all Mermaid diagram sources and inline/block math around separators', () => {
    for (const diagram of [
      'flowchart TD\nA --> B',
      'sequenceDiagram\nA->>B: Message',
      'classDiagram\nclass A',
      'stateDiagram-v2\n[*] --> A',
      'pie\n"A" : 1',
      'mindmap\n  root((Orbit))',
    ]) {
      const source = 'Paragraph\n---\n```mermaid\n' + diagram + '\n```';
      const document = new DOMParser().parseFromString(renderMarkdown(source).html, 'text/html');
      expect(document.querySelector('pre > code.language-mermaid')?.textContent).toBe(diagram + '\n');
    }
    const result = renderMarkdown(
      '$E = mc^2$\n---\n$$\n\\int_0^1 x^2 dx = \\frac{1}{3}\n$$\n\n`$literal$`\n\n```text\n$literal$\n```',
    );
    expect(result.formulas).toEqual([
      { value: 'E = mc^2', display: false },
      { value: '\\int_0^1 x^2 dx = \\frac{1}{3}', display: true },
    ]);
  });

  it('leaves standard Markdown renderable through the shared engine', () => {
    const result = renderMarkdown(normalizeNotionMarkdown(STANDARD_MARKDOWN_FIXTURE));

    expect(result.failed).toBe(false);
    expect(result.html).toContain('<table>');
    expect(result.html).toContain('language-typescript');
    expect(result.html).toContain('language-mermaid');
    expect(result.html).toContain('<sub>2</sub>');
    expect(result.html).toContain('markdown-footnotes');
    expect(result.html).toContain('markdown-definition-list');
  });

  it('converts the supported Notion table vocabulary to GFM before Marked', () => {
    const normalized = normalizeNotionMarkdown(NOTION_MARKDOWN_FIXTURE);
    const result = renderMarkdown(normalized);

    expect(normalized).not.toContain('<table header-row');
    expect(normalized).toContain('| Feature | Description | Status |');
    expect(result.html).toContain('<table>');
    expect(result.html).toContain('<strong>Study Notes</strong>');
    expect(result.html).toContain('<em>Read</em> <code>Markdown</code> lessons');
    expect(result.html).toContain('<del>Old Notes</del>');
    expect(result.html).toContain('✅ Available');
    expect(result.html).toContain('markdown-math-0');
  });

  it('escapes pipes and supports empty cells without accepting arbitrary table markup', () => {
    const valid = normalizeNotionMarkdown(
      '<table><tr><td>A | B</td><td></td></tr><tr><td>One</td><td>Two</td></tr></table>',
    );
    const unsupported = normalizeNotionMarkdown('<table onclick="run()"><tr><td>Unsafe</td></tr></table>');

    expect(valid).toContain('A \\| B');
    expect(renderMarkdown(valid).html).toContain('<table>');
    expect(unsupported).toContain('onclick');
  });

  it('recovers deterministic Notion quote, tab-list, list-code, HTML, and footnote forms', () => {
    const normalized = normalizeNotionMarkdown(NOTION_MARKDOWN_FIXTURE);
    const result = renderMarkdown(normalized);

    expect(normalized).toContain('  * Physics');
    expect(normalized).toContain('>> Level 2 quote');
    expect(normalized).toContain('>>> Level 3 quote');
    expect(result.html).toContain('<sub>2</sub>');
    expect(result.html).toContain('<mark>important</mark>');
    expect(result.html).toContain('language-bash');
    expect(result.html).toContain('npm install');
    expect(result.html).toContain('markdown-footnotes');
    expect(result.html).not.toContain('[\\[1\\]]');
  });

  it('does not change tabs inside fences or restore unsafe HTML', () => {
    const normalized = normalizeNotionMarkdown(
      '\`\`\`text\n\tkeep-tab\n\`\`\`\n\n\\<script\\>alert(1)\\</script\\>\n\n\\* literal',
    );

    expect(normalized).toContain('\tkeep-tab');
    expect(normalized).toContain('\\<script\\>');
    expect(normalized).toContain('\\* literal');
  });
});
