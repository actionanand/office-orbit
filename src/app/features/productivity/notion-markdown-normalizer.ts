const SAFE_INLINE_TAGS = new Set(['strong', 'em', 'mark', 'sub', 'sup', 'details', 'summary', 'kbd', 'br']);

export function normalizeNotionMarkdown(markdown: string): string {
  let value = markdown.replace(/\r\n?/g, '\n');
  value = normalizeThematicBreaks(value);
  value = normalizeNotionTables(value);
  value = restoreSupportedHtml(value);
  value = normalizeNestedBlockquotes(value);
  value = normalizeListTabs(value);
  value = normalizeListCodeFences(value);
  value = normalizeNotionFootnoteLinks(value);
  return prepareExtendedSyntax(value);
}

/** Notion packs adjacent blocks together; retain ordinary, blank-separated Setext headings. */
function normalizeThematicBreaks(markdown: string): string {
  const lines = markdown.split('\n');
  const output: string[] = [];
  let fence: { marker: string; length: number } | undefined;
  let previousMeaningful = '';
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const marker = /^\s*(?:>\s*)*(`{3,}|~{3,})(.*)$/.exec(line);
    if (fence) {
      output.push(line);
      if (marker && marker[1][0] === fence.marker && marker[1].length >= fence.length && !marker[2].trim()) {
        fence = undefined;
      }
      continue;
    }
    if (marker && (marker[1][0] !== '`' || !marker[2].includes('`'))) {
      fence = { marker: marker[1][0], length: marker[1].length };
      output.push(line);
      previousMeaningful = line;
      continue;
    }
    // Require adjoining content on both sides. Blank lines already disambiguate
    // thematic breaks; a blank after the underline conventionally denotes Setext.
    const packedSeparator =
      /^ {0,3}---[ \t]*$/.test(line) &&
      !!previousMeaningful &&
      !!lines[index - 1]?.trim() &&
      !!lines[index + 1]?.trim() &&
      !/^ {4}|^\t/.test(lines[index - 1]);
    if (packedSeparator) output.push('', line, '');
    else output.push(line);
    if (line.trim()) previousMeaningful = line;
  }
  return output.join('\n');
}

function normalizeNotionTables(markdown: string): string {
  return markdown.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, source => notionTableToGfm(source) ?? source);
}

function notionTableToGfm(source: string): string | null {
  const match = /^<table(?:\s+header-row="(?:true|false)")?\s*>([\s\S]*)<\/table>$/i.exec(source.trim());
  if (!match) return null;
  const body = match[1];
  const rows: string[][] = [];
  const rowPattern = /<tr\s*>([\s\S]*?)<\/tr\s*>/gi;
  let rowMatch: RegExpExecArray | null;
  while ((rowMatch = rowPattern.exec(body))) {
    const rowBody = rowMatch[1];
    const cells: string[] = [];
    const cellPattern = /<td\s*>([\s\S]*?)<\/td\s*>/gi;
    let cellMatch: RegExpExecArray | null;
    while ((cellMatch = cellPattern.exec(rowBody))) cells.push(normalizeTableCell(cellMatch[1]));
    if (!cells.length || rowBody.replace(cellPattern, '').trim()) return null;
    rows.push(cells);
  }
  if (!rows.length || body.replace(rowPattern, '').trim()) return null;

  const width = Math.max(...rows.map(row => row.length));
  const padded = rows.map(row => [...row, ...Array<string>(width - row.length).fill('')]);
  const markdownRows = [padded[0], Array<string>(width).fill('---'), ...padded.slice(1)];
  return `\n${markdownRows.map(row => `| ${row.join(' | ')} |`).join('\n')}\n`;
}

function normalizeTableCell(value: string): string {
  const flattened = value
    .trim()
    .split('\n')
    .map(line => line.trim())
    .join('<br>');
  return flattened
    .replace(/<\/?[a-z][^>]*>/gi, tag => (isSafeInlineTag(tag) ? tag : escapeHtml(tag)))
    .replace(/\|/g, '\\|');
}

function isSafeInlineTag(source: string): boolean {
  const tag = /^<(\/)?([a-z]+)(?:\s+(open))?\s*\/?>$/i.exec(source);
  return (
    !!tag && SAFE_INLINE_TAGS.has(tag[2].toLowerCase()) && (!tag[3] || (!tag[1] && tag[2].toLowerCase() === 'details'))
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function restoreSupportedHtml(markdown: string): string {
  const tags = [...SAFE_INLINE_TAGS].join('|');
  const restore = (
    _match: string,
    closing: string,
    tag: string,
    open: string | undefined,
    selfClosing: string,
  ): string => `<${closing}${tag.toLowerCase()}${open && !closing ? ' open' : ''}${selfClosing}>`;
  return markdown
    .replace(new RegExp(`&lt;(/?)(${tags})(?:\\s+(open))?\\s*(/?)&gt;`, 'gi'), restore)
    .replace(new RegExp(`\\\\<(/?)(${tags})(?:\\s+(open))?\\s*(/?)\\\\>`, 'gi'), restore);
}

function normalizeNestedBlockquotes(markdown: string): string {
  return markdown
    .split('\n')
    .map(line =>
      line.replace(
        /^(\s*>\s*)((?:\\>)+)(\s?.*)$/,
        (_match, outer: string, nested: string, rest: string) => outer.trimEnd() + nested.replace(/\\/g, '') + rest,
      ),
    )
    .join('\n');
}

function normalizeListTabs(markdown: string): string {
  const lines = markdown.split('\n');
  let fenced = false;
  return lines
    .map(line => {
      if (/^\s*(`{3,}|~{3,})/.test(line)) fenced = !fenced;
      if (fenced || !/^\t+/.test(line)) return line;
      return line.replace(/^(\t+)/, tabs => '  '.repeat(tabs.length));
    })
    .join('\n');
}

function normalizeListCodeFences(markdown: string): string {
  const lines = markdown.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const opening = /^(\s+)(`{3,}|~{3,})[^`~]*$/.exec(lines[index]);
    if (!opening || !belongsToList(lines, index)) continue;
    const indent = opening[1];
    const marker = opening[2][0];
    const minimumLength = opening[2].length;
    for (index += 1; index < lines.length; index += 1) {
      const content = lines[index];
      const closing = new RegExp(`^\\s*${marker}{${minimumLength},}\\s*$`).test(content);
      if (!content.startsWith(indent)) lines[index] = indent + content;
      if (closing) break;
    }
  }
  return lines.join('\n');
}

function belongsToList(lines: string[], fenceIndex: number): boolean {
  for (let index = fenceIndex - 1; index >= 0 && fenceIndex - index <= 4; index -= 1) {
    if (!lines[index].trim()) continue;
    return /^\s*(?:[-+*]|\d+[.)])\s+/.test(lines[index]);
  }
  return false;
}

function normalizeNotionFootnoteLinks(markdown: string): string {
  return markdown.replace(/\[\\\[([^\]]+)\\\]\]\(([^)]+)\)/g, (_match, label: string, target: string) => {
    const safeKey =
      target
        .trim()
        .replace(/[^a-z0-9_-]+/gi, '-')
        .replace(/^-|-$/g, '') || label;
    return `[^notion-${safeKey}]`;
  });
}

function prepareExtendedSyntax(markdown: string): string {
  const lines = markdown.split('\n');
  const footnotes = new Map<string, { number: number; text: string }>();
  const content: string[] = [];
  let fenced = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(`{3,}|~{3,})/.test(line)) fenced = !fenced;
    const definition = !fenced ? /^\[\^([^\]]+)\]:\s+(.+)$/.exec(line) : null;
    if (!definition) {
      content.push(line);
      continue;
    }
    const text = [definition[2]];
    while (index + 1 < lines.length && /^(?: {2,}|\t)\S/.test(lines[index + 1])) {
      text.push(lines[index + 1].trim());
      index += 1;
    }
    footnotes.set(definition[1], { number: footnotes.size + 1, text: text.join(' ') });
  }

  fenced = false;
  for (let index = 0; index < content.length; index += 1) {
    const line = content[index];
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      fenced = !fenced;
      continue;
    }
    if (!fenced) {
      content[index] = line.replace(/\[\^([^\]]+)\]/g, (match, id: string) => {
        const footnote = footnotes.get(id);
        return footnote
          ? `<sup class="markdown-footnote-ref" id="footnote-ref-${footnote.number}"><a href="#footnote-${footnote.number}" aria-label="Footnote ${footnote.number}">[${footnote.number}]</a></sup>`
          : match;
      });
    }
  }

  const withDefinitions: string[] = [];
  fenced = false;
  for (let index = 0; index < content.length; index += 1) {
    const line = content[index];
    if (/^\s*(`{3,}|~{3,})/.test(line)) fenced = !fenced;
    const definition = !fenced && index + 1 < content.length ? /^:\s+(.+)$/.exec(content[index + 1]) : null;
    if (!definition || !line.trim() || /^\s*[#>|-]/.test(line)) {
      withDefinitions.push(line);
      continue;
    }
    withDefinitions.push(
      '<dl class="markdown-definition-list">',
      `<dt>${line.trim()}</dt>`,
      `<dd>${definition[1]}</dd>`,
      '</dl>',
    );
    index += 1;
  }

  if (footnotes.size) {
    withDefinitions.push('', '<section class="markdown-footnotes" aria-label="Footnotes">', '<ol>');
    for (const footnote of footnotes.values()) {
      withDefinitions.push(
        `<li id="footnote-${footnote.number}">${footnote.text} <a class="markdown-footnote-back" href="#footnote-ref-${footnote.number}" aria-label="Back to footnote ${footnote.number}">↩</a></li>`,
      );
    }
    withDefinitions.push('</ol>', '</section>');
  }
  return withDefinitions.join('\n');
}
