import { prepareMarkdown, renderMarkdown } from './markdown-viewer.component';
import { highlightMarkdownCode } from './prism-highlighter';

const ADJACENT_MATH = String.raw`## Block Mathematics
$$
\frac{1}{2} + \frac{1}{4}
=
\frac{3}{4}
$$
## Powers
$$
x^2 + y^2 = z^2
$$
## Square Root
$$
x = \sqrt{25} = 5
$$`;

const SECTION_EQUATIONS = [
  [
    'Block Mathematics',
    String.raw`\frac{1}{2} + \frac{1}{4}
=
\frac{3}{4}`,
  ],
  ['Powers', 'x^2 + y^2 = z^2'],
  ['Square Root', String.raw`x = \sqrt{25} = 5`],
  ['Fractions', String.raw`\frac{a}{b}`],
  ['Summation', String.raw`\sum_{i=1}^{n} i = \frac{n(n+1)}{2}`],
  ['Integral', String.raw`\int_0^1 x^2 \, dx = \frac{1}{3}`],
  ['Limits', String.raw`\lim_{x \to 0} \frac{\sin x}{x} = 1`],
  ['Greek Letters', String.raw`\alpha + \beta = \gamma`],
  ['', String.raw`\pi \approx 3.14159`],
  [
    'Matrix',
    String.raw`\begin{bmatrix}
1 & 2 \\
3 & 4
\end{bmatrix}`,
  ],
  [
    'Equation With Multiple Lines',
    String.raw`\begin{aligned}
a &= b + c \\
d &= e + f \\
x &= y + z
\end{aligned}`,
  ],
];

describe('Markdown display math boundaries', () => {
  it('keeps API headings semantic after adjacent display equations', () => {
    const prepared = prepareMarkdown(ADJACENT_MATH);
    const result = renderMarkdown(ADJACENT_MATH);
    const document = new DOMParser().parseFromString(result.html, 'text/html');
    expect([...document.querySelectorAll('h2')].map(heading => heading.textContent)).toEqual([
      'Block Mathematics',
      'Powers',
      'Square Root',
    ]);
    expect(result.html).not.toContain('## Powers');
    expect(result.html).not.toContain('## Square Root');
    expect(document.querySelectorAll('.markdown-math-block')).toHaveLength(3);
    expect(prepared.formulas).toHaveLength(3);
    expect(prepared.source).toContain('</div>\n\n## Powers');
  });

  it('renders the full section with both spaced and packed API block boundaries', () => {
    for (const gap of ['\n', '\n\n']) {
      const source =
        '# 16. KaTeX / Mathematical Expressions' +
        gap +
        '## Inline Mathematics' +
        gap +
        String.raw`Einstein's famous equation is $E = mc^2$.
The area of a circle is $A = \pi r^2$.
A fraction can appear inline as $\frac{3}{4}$.` +
        gap +
        SECTION_EQUATIONS.map(
          ([heading, equation]) => (heading ? '## ' + heading + gap : '') + '$$\n' + equation + '\n$$',
        ).join(gap);
      const result = renderMarkdown(source);
      const document = new DOMParser().parseFromString(result.html, 'text/html');
      expect([...document.querySelectorAll('h2')].map(node => node.textContent)).toEqual([
        'Inline Mathematics',
        ...SECTION_EQUATIONS.map(([heading]) => heading).filter(Boolean),
      ]);
      expect(result.formulas.filter(formula => formula.display).map(formula => formula.value)).toEqual(
        SECTION_EQUATIONS.map(([, equation]) => equation),
      );
      expect(document.querySelectorAll('.markdown-math-block')).toHaveLength(11);
      expect(document.querySelectorAll('p > span.markdown-math')).toHaveLength(3);
    }
  });

  it('retains quote and nested-list context around display placeholders', () => {
    for (const prefix of ['> ', '> > ']) {
      const source = ['Formula:', '', '$$', 'x^2 = 4', '$$', '', 'After formula'].map(line => prefix + line).join('\n');
      const document = new DOMParser().parseFromString(renderMarkdown(source).html, 'text/html');
      const quote = prefix === '> ' ? 'blockquote' : 'blockquote blockquote';
      expect(document.querySelector(quote + ' > .markdown-math-block')).not.toBeNull();
      expect(document.querySelector(quote)?.textContent).toContain('After formula');
    }
    const source = '1. Topic\n    Formula:\n    $$\n    \\frac{a}{b}\n    $$\n    After formula\n\n2. Next';
    const document = new DOMParser().parseFromString(renderMarkdown(source).html, 'text/html');
    expect(document.querySelector('ol > li > .markdown-math-block')).not.toBeNull();
    expect(document.querySelector('ol > li > p:last-child')?.textContent?.trim()).toBe('After formula');
    expect(document.querySelectorAll('ol > li')).toHaveLength(2);
  });

  it('separates following headings, paragraphs, rules, lists, and Mermaid fences', () => {
    const source =
      '## Heading Before\n$$\nx = 1\n$$\n## Heading After\n### H3 After\n$$y = 2$$\n#### H4 After\n$$\nx = 1\n$$\nThis is a normal paragraph.\n\n$$\nx = 1\n$$\n---\n# Next Section\n$$x = 1$$\n- List item\n\n$$\nx = 1\n$$\n## Diagram\n```mermaid\nflowchart LR\n    A --> B\n````';
    const result = renderMarkdown(source);
    for (const html of [
      '<h2>Heading After</h2>',
      '<h3>H3 After</h3>',
      '<h4>H4 After</h4>',
      '<p>This is a normal paragraph.</p>',
      '<hr>',
      '<h1>Next Section</h1>',
      '<li>List item</li>',
      '<h2>Diagram</h2>',
    ]) {
      expect(result.html).toContain(html);
    }
    const document = new DOMParser().parseFromString(result.html, 'text/html');
    expect(document.querySelector('pre > code.language-mermaid')?.textContent).toContain('flowchart LR');
  });

  it('preserves fenced source and Prism highlighting after math', async () => {
    const source =
      '$$\nx = 1\n$$\n\n## TypeScript\n\n```typescript\nconst value: number = 1;\n```\n\n```text\n$$\nnot math\n$$\n```';
    const result = renderMarkdown(source);
    const host = document.createElement('div');
    host.innerHTML = result.html;
    const blocks = await highlightMarkdownCode(host);
    expect(host.querySelector('h2')?.textContent).toBe('TypeScript');
    expect(host.querySelector('code.language-typescript .token.keyword')).not.toBeNull();
    expect(blocks[0].source).toBe('const value: number = 1;\n');
    expect(blocks[1].source).toBe('$$\nnot math\n$$\n');
    expect(result.formulas).toHaveLength(1);
  });
});
