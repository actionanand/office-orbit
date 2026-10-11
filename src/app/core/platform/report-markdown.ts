import { Lexer, Token, Tokens } from 'marked';
import type { ReportBlock, ReportTextRun } from '../../features/work-logs/work-log-report';

function inline(tokens: Token[], style: Omit<ReportTextRun, 'text'> = {}): ReportTextRun[] {
  return tokens
    .flatMap((token): ReportTextRun[] => {
      switch (token.type) {
        case 'strong':
        case 'em':
        case 'del':
        case 'link': {
          const nested = token as Tokens.Link | Tokens.Strong | Tokens.Em | Tokens.Del;
          const href = token.type === 'link' ? (token as Tokens.Link).href : undefined;
          return inline(nested.tokens, {
            ...style,
            ...(token.type === 'strong' ? { bold: true } : {}),
            ...(token.type === 'em' ? { italic: true } : {}),
            ...(token.type === 'del' ? { strike: true } : {}),
            ...(href && /^(https?:\/\/|mailto:)/i.test(href) ? { href } : {}),
          });
        }
        case 'image':
          return [{ ...style, text: (token as Tokens.Image).text }];
        case 'br':
          return [{ ...style, text: '\n' }];
        case 'html':
          return [{ ...style, text: token.raw.replace(/<[^>]*>/g, '') }];
        default:
          return [
            {
              ...style,
              ...(token.type === 'codespan' ? { code: true } : {}),
              text: 'text' in token ? String(token.text) : token.raw,
            },
          ];
      }
    })
    .map(run => ({
      ...run,
      text: run.text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'"),
    }));
}

export function markdownInline(source: string): ReportTextRun[] {
  return inline(Lexer.lexInline(source));
}

function content(tokens: Token[]): Pick<ReportBlock, 'text' | 'runs'> {
  const runs = inline(tokens);
  return { text: runs.map(run => run.text).join(''), runs };
}

/** Keep field labels separate so headings/lists in notes parse as Markdown blocks. */
export function markdownFieldBlocks(source: string): ReportBlock[] {
  const field = /^(Comment|Went wrong|Notes|Reason|Spill reason):\s*([\s\S]*)$/.exec(source);
  return field ? [{ kind: 'heading', text: field[1], level: 3 }, ...markdownBlocks(field[2])] : markdownBlocks(source);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!,
  );
}

export function reportInlineHtml(runs: ReportTextRun[]): string {
  return runs
    .map(run => {
      let html = escapeHtml(run.text).replace(/\n/g, '<br>');
      if (run.code) html = `<code>${html}</code>`;
      if (run.bold) html = `<strong>${html}</strong>`;
      if (run.italic) html = `<em>${html}</em>`;
      if (run.strike) html = `<del>${html}</del>`;
      if (run.href && /^(https?:\/\/|mailto:)/i.test(run.href)) html = `<a href="${escapeHtml(run.href)}">${html}</a>`;
      return html;
    })
    .join('');
}

export function reportBlocksHtml(blocks: ReportBlock[]): string {
  return blocks
    .map(block => {
      const html = reportInlineHtml(block.runs ?? [{ text: block.text }]);
      switch (block.kind) {
        case 'rule':
          return '<hr>';
        case 'code':
          return `<pre><code>${escapeHtml(block.text)}</code></pre>`;
        case 'heading':
          return `<h${Math.min(6, (block.level ?? 2) + 2)}>${html}</h${Math.min(6, (block.level ?? 2) + 2)}>`;
        case 'quote':
          return `<blockquote>${html}</blockquote>`;
        case 'bullet': {
          const prefix = /^(•|\d+\.|\[[ x]\])\s+/.exec(block.text);
          if (!prefix) return `<p>${html}</p>`;
          const runs = block.runs?.map((run, index) =>
            index === 0 ? { ...run, text: run.text.slice(prefix[0].length) } : run,
          );
          const body = reportInlineHtml(runs ?? [{ text: block.text.slice(prefix[0].length) }]);
          return `<p style="display:grid;grid-template-columns:max-content minmax(0,1fr);column-gap:6px;margin-left:${12 + (block.level ?? 0) * 16}px"><span>${escapeHtml(prefix[1])}</span><span>${body}</span></p>`;
        }
        case 'table':
          return `<table><tr>${block.cells?.map((cell, index) => `<${block.header ? 'th' : 'td'}>${reportInlineHtml(block.cellRuns?.[index] ?? [{ text: cell }])}</${block.header ? 'th' : 'td'}>`).join('') ?? ''}</tr></table>`;
        default:
          return `<p>${html}</p>`;
      }
    })
    .join('');
}

/** Parse Markdown into printable blocks; no HTML or Markdown syntax is drawn into the PDF. */
export function markdownBlocks(source: string): ReportBlock[] {
  return blocksFromTokens(Lexer.lex(source));
}

function blocksFromTokens(tokens: Token[]): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  const visit = (tokens: Token[], depth = 0) => {
    for (const token of tokens) {
      switch (token.type) {
        case 'space':
        case 'def':
          break;
        case 'heading': {
          const heading = token as Tokens.Heading;
          blocks.push({ kind: 'heading', ...content(heading.tokens), level: heading.depth });
          break;
        }
        case 'paragraph':
        case 'text': {
          const paragraph = token as Tokens.Paragraph;
          blocks.push({ kind: 'text', ...(paragraph.tokens ? content(paragraph.tokens) : { text: paragraph.text }) });
          break;
        }
        case 'list': {
          const list = token as Tokens.List;
          list.items.forEach((item, index) => {
            const nested = blocksFromTokens(item.tokens);
            const first = nested.shift();
            const prefix = item.task
              ? item.checked
                ? '[x]'
                : '[ ]'
              : list.ordered
                ? `${Number(list.start) + index}.`
                : '•';
            blocks.push({
              kind: 'bullet',
              text: `${prefix} ${first?.text ?? ''}`,
              runs: [{ text: `${prefix} ` }, ...(first?.runs ?? [{ text: first?.text ?? '' }])],
              level: depth,
            });
            blocks.push(...nested.map(block => ({ ...block, level: depth + 1 + (block.level ?? 0) })));
          });
          break;
        }
        case 'blockquote': {
          const quote = token as Tokens.Blockquote;
          blocks.push(...blocksFromTokens(quote.tokens).map(block => ({ ...block, kind: 'quote' as const })));
          break;
        }
        case 'code':
          blocks.push({ kind: 'code', text: (token as Tokens.Code).text });
          break;
        case 'hr':
          blocks.push({ kind: 'rule', text: '' });
          break;
        case 'table': {
          const table = token as Tokens.Table;
          blocks.push({
            kind: 'table',
            text: '',
            cells: table.header.map(cell => content(cell.tokens).text),
            cellRuns: table.header.map(cell => inline(cell.tokens)),
            header: true,
          });
          blocks.push(
            ...table.rows.map(row => ({
              kind: 'table' as const,
              text: '',
              cells: row.map(cell => content(cell.tokens).text),
              cellRuns: row.map(cell => inline(cell.tokens)),
            })),
          );
          break;
        }
        case 'html': {
          const text = token.raw
            .replace(/<\/(?:p|div|h[1-6]|li)>/gi, '\n')
            .replace(/<br\s*\/?\s*>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .trim();
          if (text) blocks.push({ kind: 'text', text });
          break;
        }
      }
    }
  };
  visit(tokens);
  return blocks;
}
