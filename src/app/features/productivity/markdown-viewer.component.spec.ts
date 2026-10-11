import { TestBed } from '@angular/core/testing';
import { MarkdownViewerComponent, renderInlineMarkdown, renderMarkdown } from './markdown-viewer.component';

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn(),
}));

vi.mock('mermaid', () => ({ default: mermaidMock }));

describe('MarkdownViewerComponent', () => {
  beforeEach(() => {
    mermaidMock.initialize.mockReset();
    mermaidMock.render.mockReset();
    mermaidMock.render.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 50"><text>Diagram</text></svg>',
    });
  });

  it('renders the reported description link without falling back to raw Markdown', async () => {
    const source =
      'This is from LSC-81365. We created this as DB deployment was blocked by other team\n\n[link text](https://google.com)';
    expect(renderMarkdown(source).failed).toBe(false);
    const fixture = TestBed.createComponent(MarkdownViewerComponent);
    fixture.componentRef.setInput('markdown', source);
    fixture.detectChanges();
    await settleEnhancements();
    const element: HTMLElement = fixture.nativeElement;
    const link = element.querySelector('a');
    expect(link?.getAttribute('href')).toBe('https://google.com');
    expect(link?.textContent).toBe('link text');
    expect(link?.getAttribute('target')).toBe('_blank');
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(element.querySelector('.markdown-source, .content-warning')).toBeNull();
  });

  it('preserves formatted link labels in full and inline Markdown while rejecting unsafe destinations', () => {
    for (const source of ['[**Docs**](https://example.com)', '[**Docs**](javascript:alert(1))']) {
      const full = renderMarkdown(source);
      expect(full.failed).toBe(false);
      expect(full.html).toContain('<strong>Docs</strong>');
      expect(renderInlineMarkdown(source)).toContain('<strong>Docs</strong>');
    }
    expect(renderInlineMarkdown('[Docs](https://example.com)')).toContain('href="https://example.com"');
    expect(renderMarkdown('[Docs](javascript:alert(1))').html).not.toContain('href=');
  });

  it('renders multiple strict Mermaid diagrams and replaces their source blocks', async () => {
    const fixture = TestBed.createComponent(MarkdownViewerComponent);
    fixture.componentRef.setInput(
      'markdown',
      '```mermaid\nflowchart LR\nA --> B\n```\n\n```mermaid\nsequenceDiagram\nA->>B: Message\n```',
    );
    fixture.detectChanges();
    await settleEnhancements();

    expect(mermaidMock.initialize).toHaveBeenCalledWith(
      expect.objectContaining({ startOnLoad: false, securityLevel: 'strict' }),
    );
    expect(mermaidMock.render).toHaveBeenCalledTimes(2);
    expect(fixture.nativeElement.querySelectorAll('.markdown-mermaid')).toHaveLength(2);
    expect(fixture.nativeElement.querySelector('code.language-mermaid')).toBeNull();
  });

  it('keeps Mermaid source and adds an accessible warning when rendering fails', async () => {
    mermaidMock.render.mockRejectedValueOnce(new Error('Invalid diagram'));
    const fixture = TestBed.createComponent(MarkdownViewerComponent);
    fixture.componentRef.setInput('markdown', '```mermaid\nnot a diagram\n```');
    fixture.detectChanges();
    await settleEnhancements();

    expect(fixture.nativeElement.querySelector('code.language-mermaid')?.textContent).toContain('not a diagram');
    const warning = fixture.nativeElement.querySelector('.markdown-diagram-error');
    expect(warning?.getAttribute('role')).toBe('alert');
  });

  it.each([
    [
      'stateDiagram-v2\n[*] --> NotStarted\nNotStarted --> InProgress\nInProgress --> Completed\nCompleted --> Reviewed\nReviewed --> [*]',
      '0 0 220 700',
    ],
    ['flowchart TD\nA[Start] --> B[Step One]\nB --> C[Step Two]', '0 0 420 600'],
    [
      'flowchart LR\nA[Office Orbit] --> B[Cloudflare Worker]\nB --> C[Notion]\nC --> D[Reference Library]',
      '0 0 1400 240',
    ],
    ['sequenceDiagram\nA->>B: Message', '0 0 700 400'],
    ['pie\n"A" : 1', '0 0 450 450'],
    ['mindmap\n  root((Orbit))', '-20 -10 400 300'],
    ['classDiagram\nclass Orbit', '0 0 300 250'],
  ])('preserves natural sizing and accessible container for %s', async (source, viewBox) => {
    mermaidMock.render.mockResolvedValue({
      svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" width="100%" height="800" style="max-width: 100%;"><text>Diagram</text></svg>`,
    });
    const fixture = TestBed.createComponent(MarkdownViewerComponent);
    fixture.componentRef.setInput('markdown', '```mermaid\n' + source + '\n```');
    fixture.detectChanges();
    await settleEnhancements();
    const container: HTMLElement = fixture.nativeElement.querySelector('.markdown-mermaid');
    const svg = container.querySelector('svg');
    expect(svg?.getAttribute('viewBox')).toBe(viewBox);
    expect(svg?.getAttribute('width')).toBe(viewBox.split(' ')[2]);
    expect(svg?.hasAttribute('height')).toBe(false);
    expect(svg?.hasAttribute('style')).toBe(false);
    expect(container.getAttribute('role')).toBe('img');
    expect(container.getAttribute('aria-label')).toBe('Mermaid diagram');
  });

  it('removes unsafe SVG content and attributes while retaining viewBox and local references', async () => {
    mermaidMock.render.mockResolvedValue({
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 700" onload="bad()"><script>bad()</script><iframe/><object/><embed/><g onclick="bad()"><a href="javascript:bad()">Unsafe</a><use href="#node"/></g></svg>',
    });
    const fixture = TestBed.createComponent(MarkdownViewerComponent);
    fixture.componentRef.setInput('markdown', '```mermaid\nflowchart TD\nA --> B\n```');
    fixture.detectChanges();
    await settleEnhancements();
    const svg: SVGElement = fixture.nativeElement.querySelector('.markdown-mermaid svg');
    expect(svg.querySelector('script, iframe, object, embed, [onclick]')).toBeNull();
    expect(svg.hasAttribute('onload')).toBe(false);
    expect(svg.querySelector('a')?.hasAttribute('href')).toBe(false);
    expect(svg.querySelector('use')?.getAttribute('href')).toBe('#node');
    expect(svg.getAttribute('viewBox')).toBe('0 0 420 700');
  });

  it.each([
    ['![Sample educational image](https://placehold.co/600x300)', 'Sample educational image', false],
    ['[![Learning illustration](https://placehold.co/600x300)](https://example.com)', 'Learning illustration', true],
  ])('uses image alt text as a caption without breaking links', async (markdown, caption, linked) => {
    const fixture = TestBed.createComponent(MarkdownViewerComponent);
    fixture.componentRef.setInput('markdown', markdown);
    fixture.detectChanges();
    await settleEnhancements();
    const figure = fixture.nativeElement.querySelector('figure.markdown-image');
    expect(figure.querySelector('img')?.alt).toBe(caption);
    expect(figure.querySelector('figcaption')?.textContent).toBe(caption);
    expect(figure.querySelector('img')?.loading).toBe('lazy');
    expect(figure.querySelector('img')?.decoding).toBe('async');
    expect(!!figure.querySelector('a > img')).toBe(linked);
    fixture.detectChanges();
    await settleEnhancements();
    expect(fixture.nativeElement.querySelectorAll('figcaption')).toHaveLength(1);
  });

  it('does not caption an image with blank alt text', async () => {
    const fixture = TestBed.createComponent(MarkdownViewerComponent);
    fixture.componentRef.setInput('markdown', '![](https://placehold.co/600x300)');
    fixture.detectChanges();
    await settleEnhancements();
    expect(fixture.nativeElement.querySelector('img')?.loading).toBe('lazy');
    expect(fixture.nativeElement.querySelector('figure, figcaption')).toBeNull();
  });
});

async function settleEnhancements(): Promise<void> {
  await new Promise(resolve => window.setTimeout(resolve));
  await new Promise(resolve => window.setTimeout(resolve));
}
