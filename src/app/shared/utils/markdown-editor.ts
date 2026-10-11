export type MarkdownAction =
  'bold' | 'italic' | 'code' | 'link' | 'unordered' | 'ordered' | 'indent' | 'outdent' | 'heading' | 'quote' | 'fence';

export interface MarkdownEdit {
  value: string;
  selectionStart: number;
  selectionEnd: number;
  replaceStart: number;
  replaceEnd: number;
  replacement: string;
}

/** Edits only the selected source range; surrounding whitespace and blank lines are preserved. */
export function formatMarkdown(source: string, start: number, end: number, action: MarkdownAction): MarkdownEdit {
  start = Math.max(0, Math.min(source.length, start));
  end = Math.max(start, Math.min(source.length, end));
  const selected = source.slice(start, end);
  const edit = (
    replacement: string,
    from: number,
    to: number,
    replaceStart = start,
    replaceEnd = end,
  ): MarkdownEdit => ({
    value: source.slice(0, replaceStart) + replacement + source.slice(replaceEnd),
    selectionStart: replaceStart + from,
    selectionEnd: replaceStart + to,
    replaceStart,
    replaceEnd,
    replacement,
  });

  if (action === 'link') {
    const label = selected || 'link text';
    const replacement = `[${label}](https://)`;
    return edit(replacement, label.length + 3, replacement.length - 1);
  }
  if (action === 'bold' || action === 'italic' || action === 'code') {
    const marker = action === 'bold' ? '**' : action === 'italic' ? '*' : '`';
    const text = selected || (action === 'bold' ? 'bold text' : action === 'italic' ? 'italic text' : 'code');
    return edit(marker + text + marker, marker.length, marker.length + text.length);
  }
  if (action === 'fence') {
    const text = selected || 'code';
    const prefix = start > 0 && source[start - 1] !== '\n' ? '\n' : '';
    const suffix = end < source.length && source[end] !== '\n' ? '\n' : '';
    const replacement = prefix + '```\n' + text + '\n```' + suffix;
    return edit(replacement, prefix.length + 4, prefix.length + 4 + text.length);
  }
  if (!selected.trim() && (action === 'unordered' || action === 'ordered')) {
    const prefix = start > 0 && source[start - 1] !== '\n' ? '\n' : '';
    const marker = action === 'unordered' ? '- ' : '1. ';
    const suffix = end < source.length && source[end] !== '\n' ? '\n' : '';
    return edit(
      prefix + marker + 'List item' + suffix,
      prefix.length + marker.length,
      prefix.length + marker.length + 9,
    );
  }

  const lineStart = start === 0 ? 0 : source.lastIndexOf('\n', start - 1) + 1;
  // A selection ending at the next line's start does not include that next line.
  const lastPosition = end > start && source[end - 1] === '\n' ? end - 1 : end;
  const nextBreak = source.indexOf('\n', lastPosition);
  const lineEnd = nextBreak === -1 ? source.length : nextBreak;
  let number = 0;
  const replacement = source
    .slice(lineStart, lineEnd)
    .split('\n')
    .map(line => {
      if (!line.trim()) return line;
      if (action === 'indent') return '    ' + line;
      if (action === 'outdent') return line.replace(/^(?:\t| {1,4})/, '');
      const indent = /^\s*/.exec(line)?.[0] ?? '';
      const text = line.slice(indent.length);
      const marker =
        action === 'unordered' ? '- ' : action === 'ordered' ? `${++number}. ` : action === 'heading' ? '## ' : '> ';
      return indent + marker + text;
    })
    .join('\n');
  if ((action === 'indent' || action === 'outdent') && start === end) {
    const delta = replacement.length - (lineEnd - lineStart);
    const caret = Math.max(0, start - lineStart + delta);
    return edit(replacement, caret, caret, lineStart, lineEnd);
  }
  return edit(replacement, 0, replacement.length, lineStart, lineEnd);
}
