import { markdownBlocks, markdownInline, safeMarkdownUrl } from './markdown-viewer.component';
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

  it('parses Markdown as typed display blocks while preserving code as text', () => {
    expect(markdownBlocks('# Heading\n\n- one\n- two\n\n```html\n<script>x</script>\n```')).toEqual([
      { kind: 'heading', level: 1, text: 'Heading' },
      {
        kind: 'list',
        ordered: false,
        items: [
          { text: 'one', checked: null, depth: 0 },
          { text: 'two', checked: null, depth: 0 },
        ],
      },
      { kind: 'code', text: '<script>x</script>' },
    ]);
  });

  it('renders common inline Markdown while rejecting unsafe link schemes', () => {
    expect(markdownInline('Use **bold**, `code`, and [docs](https://example.com).')).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'strong', text: 'bold' },
      { kind: 'text', text: ', ' },
      { kind: 'code', text: 'code' },
      { kind: 'text', text: ', and ' },
      { kind: 'link', text: 'docs', href: 'https://example.com' },
      { kind: 'text', text: '.' },
    ]);
    expect(safeMarkdownUrl('javascript:alert(1)')).toBeNull();
  });

  it('validates Markdown imports before upload', () => {
    expect(validateMarkdownFile(null)).toContain('Choose');
    expect(validateMarkdownFile(new File([], 'empty.md'))).toContain('non-empty');
    expect(validateMarkdownFile(new File(['text'], 'notes.txt'))).toContain('.md');
    expect(validateMarkdownFile(new File([new Uint8Array(MAX_MARKDOWN_BYTES + 1)], 'large.md'))).toContain('4.5 MB');
    expect(validateMarkdownFile(new File(['# Notes'], 'notes.markdown'))).toBe('');
  });
});
