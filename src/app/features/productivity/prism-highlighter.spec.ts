import { renderMarkdown } from './markdown-viewer.component';
import { highlightMarkdownCode, normalizePrismLanguage } from './prism-highlighter';

describe('Markdown Prism highlighter', () => {
  it('normalizes only the supported language aliases', () => {
    expect(normalizePrismLanguage('js')).toBe('javascript');
    expect(normalizePrismLanguage('ts')).toBe('typescript');
    expect(normalizePrismLanguage('html')).toBe('markup');
    expect(normalizePrismLanguage('shell')).toBe('bash');
    expect(normalizePrismLanguage('plain')).toBe('plaintext');
    expect(normalizePrismLanguage('python')).toBeNull();
  });

  it('highlights supported fences inside one viewer and leaves Mermaid untouched', async () => {
    const host = document.createElement('div');
    host.innerHTML = renderMarkdown(`\`\`\`javascript
const js = 1;
\`\`\`
\`\`\`typescript
const ts: number = 1;
\`\`\`
\`\`\`html
<div>Test</div>
\`\`\`
\`\`\`css
.test { color: red; }
\`\`\`
\`\`\`json
{"value":1}
\`\`\`
\`\`\`bash
npm run build
\`\`\`
\`\`\`mermaid
flowchart LR
  A --> B
\`\`\``).html;

    const blocks = await highlightMarkdownCode(host);

    expect(blocks.map(block => block.language)).toEqual(['javascript', 'typescript', 'markup', 'css', 'json', 'bash']);
    expect(host.querySelectorAll('.token').length).toBeGreaterThan(6);
    expect(host.querySelector('code.language-mermaid')?.innerHTML).toBe('flowchart LR\n  A --&gt; B\n');
    expect(blocks[0].source).toBe('const js = 1;\n');
  });

  it('keeps plain text unchanged and does not duplicate highlighting markup', async () => {
    const host = document.createElement('div');
    host.innerHTML = renderMarkdown('```text\n<plain>\n```').html;

    await highlightMarkdownCode(host);
    const once = host.querySelector('code')?.innerHTML;
    await highlightMarkdownCode(host);

    expect(host.querySelector('code')?.innerHTML).toBe(once);
    expect(host.querySelectorAll('.token')).toHaveLength(0);
  });
});
