import { TestBed } from '@angular/core/testing';
import { MarkdownViewerComponent } from './markdown-viewer.component';

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
});

async function settleEnhancements(): Promise<void> {
  await new Promise(resolve => window.setTimeout(resolve));
  await new Promise(resolve => window.setTimeout(resolve));
}
