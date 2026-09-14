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
});

async function settleEnhancements(): Promise<void> {
  await new Promise(resolve => window.setTimeout(resolve));
  await new Promise(resolve => window.setTimeout(resolve));
}
