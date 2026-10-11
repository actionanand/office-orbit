import { formatMarkdown } from './markdown-editor';

describe('Markdown source formatting', () => {
  it.each([
    ['bold', '**Angular**', 2, 9],
    ['italic', '*Angular*', 1, 8],
    ['code', '`Angular`', 1, 8],
    ['link', '[Angular](https://)', 10, 18],
  ] as const)('formats a selection with %s and selects the editable portion', (action, value, start, end) => {
    expect(formatMarkdown('Angular', 0, 7, action)).toMatchObject({ value, selectionStart: start, selectionEnd: end });
  });

  it.each([
    ['bold', '**bold text**', 'bold text'],
    ['italic', '*italic text*', 'italic text'],
    ['code', '`code`', 'code'],
    ['unordered', '- List item', 'List item'],
    ['ordered', '1. List item', 'List item'],
    ['link', '[link text](https://)', 'https://'],
    ['fence', '```\ncode\n```', 'code'],
  ] as const)('inserts a useful %s placeholder at the current caret', (action, value, selected) => {
    const result = formatMarkdown('', 0, 0, action);
    expect(result.value).toBe(value);
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe(selected);
  });

  it('prefixes complete affected lines and preserves blank lines and indentation', () => {
    const source = 'Before\n  One\n\n  Two\nAfter';
    const result = formatMarkdown(source, source.indexOf('ne'), source.indexOf('Two') + 1, 'unordered');
    expect(result.value).toBe('Before\n  - One\n\n  - Two\nAfter');
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe('  - One\n\n  - Two');
  });

  it('numbers nonblank lines without including the next line at a selection boundary', () => {
    const source = 'One\n\nTwo\nThree';
    const result = formatMarkdown(source, 0, source.indexOf('Three'), 'ordered');
    expect(result.value).toBe('1. One\n\n2. Two\nThree');
  });

  it.each(['heading', 'quote'] as const)('supports full toolbar %s over complete lines', action => {
    expect(formatMarkdown('One\nTwo', 1, 6, action).value).toBe(
      action === 'heading' ? '## One\n## Two' : '> One\n> Two',
    );
  });

  it('inserts a fenced block at a middle caret without joining surrounding text', () => {
    const result = formatMarkdown('BeforeAfter', 6, 6, 'fence');
    expect(result.value).toBe('Before\n```\ncode\n```\nAfter');
    expect(result.value.slice(result.selectionStart, result.selectionEnd)).toBe('code');
  });

  it.each(['- One\n- Two', '1. One\n2. Two'])(
    'indents and outdents selected list lines without changing their markers',
    source => {
      const indented = formatMarkdown(source, 1, source.length - 1, 'indent');
      expect(indented.value).toBe(
        source
          .split('\n')
          .map(line => '    ' + line)
          .join('\n'),
      );
      expect(indented.value.slice(indented.selectionStart, indented.selectionEnd)).toBe(indented.value);
      const restored = formatMarkdown(indented.value, indented.selectionStart, indented.selectionEnd, 'outdent');
      expect(restored.value).toBe(source);
    },
  );

  it('indents the complete current list item at a collapsed caret and preserves blank lines', () => {
    const source = '- Parent\n\n- Child\n- Next';
    const result = formatMarkdown(source, source.indexOf('Child') + 2, source.indexOf('Child') + 2, 'indent');
    expect(result.value).toBe('- Parent\n\n    - Child\n- Next');
    expect(result.selectionStart).toBe(source.indexOf('Child') + 6);
    expect(result.selectionEnd).toBe(result.selectionStart);
  });

  it('removes one indentation level, handles tabs and never removes list markers', () => {
    const source = '\t- One\n  1. Two\n        - Three\n\n- Four';
    expect(formatMarkdown(source, 0, source.length, 'outdent').value).toBe('- One\n1. Two\n    - Three\n\n- Four');
  });
});
