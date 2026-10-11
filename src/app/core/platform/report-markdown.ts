import { Lexer, Token, Tokens } from 'marked';
import { ReportBlock } from '../../features/work-logs/work-log-report';

function inline(tokens: Token[]): string {
  return tokens
    .map(token => {
      switch (token.type) {
        case 'strong':
        case 'em':
        case 'del':
        case 'link': {
          const nested = token as Tokens.Link | Tokens.Strong | Tokens.Em | Tokens.Del;
          const label = inline(nested.tokens);
          return token.type === 'link' ? `${label} (${(token as Tokens.Link).href})` : label;
        }
        case 'image':
          return `${(token as Tokens.Image).text} (${(token as Tokens.Image).href})`;
        case 'br':
          return '\n';
        case 'html':
          return token.raw.replace(/<[^>]*>/g, '');
        default:
          return 'text' in token ? String(token.text) : token.raw;
      }
    })
    .join('')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

/** Parse Markdown into printable blocks; no HTML or Markdown syntax is drawn into the PDF. */
export function markdownBlocks(source: string): ReportBlock[] {
  const blocks: ReportBlock[] = [];
  const visit = (tokens: Token[], depth = 0) => {
    for (const token of tokens) {
      switch (token.type) {
        case 'space':
        case 'def':
          break;
        case 'heading': {
          const heading = token as Tokens.Heading;
          blocks.push({ kind: 'heading', text: inline(heading.tokens), level: heading.depth });
          break;
        }
        case 'paragraph':
        case 'text': {
          const paragraph = token as Tokens.Paragraph;
          blocks.push({ kind: 'text', text: paragraph.tokens ? inline(paragraph.tokens) : paragraph.text });
          break;
        }
        case 'list': {
          const list = token as Tokens.List;
          list.items.forEach((item, index) => {
            const nested = markdownBlocks(item.text);
            const first = nested.shift();
            const prefix = item.task
              ? item.checked
                ? '[x]'
                : '[ ]'
              : list.ordered
                ? `${Number(list.start) + index}.`
                : '•';
            blocks.push({ kind: 'bullet', text: `${prefix} ${first?.text ?? ''}`, level: depth });
            blocks.push(...nested.map(block => ({ ...block, level: depth + 1 })));
          });
          break;
        }
        case 'blockquote': {
          const quote = token as Tokens.Blockquote;
          blocks.push(...markdownBlocks(quote.text).map(block => ({ ...block, kind: 'quote' as const })));
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
          blocks.push({ kind: 'table', text: '', cells: table.header.map(cell => inline(cell.tokens)), header: true });
          blocks.push(
            ...table.rows.map(row => ({
              kind: 'table' as const,
              text: '',
              cells: row.map(cell => inline(cell.tokens)),
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
  visit(Lexer.lex(source));
  return blocks;
}
