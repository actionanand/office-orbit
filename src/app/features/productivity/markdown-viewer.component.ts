import { Component, computed, input } from '@angular/core';

export type InlineToken =
  | { kind: 'text' | 'strong' | 'emphasis' | 'strike' | 'code'; text: string }
  | { kind: 'link'; text: string; href: string };

export interface MarkdownListItem {
  text: string;
  checked: boolean | null;
  depth: number;
}

export type MarkdownBlock =
  | { kind: 'heading'; level: number; text: string }
  | { kind: 'paragraph' | 'quote'; text: string }
  | { kind: 'list'; ordered: boolean; items: MarkdownListItem[] }
  | { kind: 'code'; text: string };

const INLINE_PATTERN =
  /(\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|~~([^~]+)~~|`([^`]+)`|\*([^*]+)\*|_([^_]+)_)/g;

export function markdownInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let start = 0;
  for (const match of text.matchAll(INLINE_PATTERN)) {
    const index = match.index ?? 0;
    if (index > start) tokens.push({ kind: 'text', text: text.slice(start, index) });
    if (match[2] && match[3]) {
      const href = safeMarkdownUrl(match[3]);
      tokens.push(href ? { kind: 'link', text: match[2], href } : { kind: 'text', text: match[0] });
    } else if (match[4] || match[5]) tokens.push({ kind: 'strong', text: match[4] ?? match[5] ?? '' });
    else if (match[6]) tokens.push({ kind: 'strike', text: match[6] });
    else if (match[7]) tokens.push({ kind: 'code', text: match[7] });
    else tokens.push({ kind: 'emphasis', text: match[8] ?? match[9] ?? '' });
    start = index + match[0].length;
  }
  if (start < text.length) tokens.push({ kind: 'text', text: text.slice(start) });
  return tokens.length ? tokens : [{ kind: 'text', text }];
}

export function safeMarkdownUrl(value: string): string | null {
  const trimmed = value.trim();
  if (/^(https?:|mailto:)/i.test(trimmed) || /^(\/|#)/.test(trimmed)) return trimmed;
  return null;
}

export function markdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index] ?? '';
    if (!line.trim()) {
      index += 1;
      continue;
    }
    if (line.trimStart().startsWith('```')) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index]?.trimStart().startsWith('```')) code.push(lines[index++] ?? '');
      if (index < lines.length) index += 1;
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    const heading = /^(#{1,6})\s+(.+)$/.exec(line);
    if (heading) {
      blocks.push({ kind: 'heading', level: heading[1].length, text: heading[2] });
      index += 1;
      continue;
    }
    if (/^>\s?/.test(line)) {
      blocks.push({ kind: 'quote', text: line.replace(/^>\s?/, '') });
      index += 1;
      continue;
    }
    const listMatch = /^(\s*)(?:([-*+])|(\d+)\.)\s+(.+)$/.exec(line);
    if (listMatch) {
      const ordered = Boolean(listMatch[3]);
      const items: MarkdownListItem[] = [];
      while (index < lines.length) {
        const match = /^(\s*)(?:([-*+])|(\d+)\.)\s+(.+)$/.exec(lines[index] ?? '');
        if (!match || Boolean(match[3]) !== ordered) break;
        const checklist = /^\[([ xX])\]\s+(.+)$/.exec(match[4]);
        items.push({
          text: checklist?.[2] ?? match[4],
          checked: checklist ? checklist[1].toLowerCase() === 'x' : null,
          depth: Math.floor(match[1].replace(/\t/g, '  ').length / 2),
        });
        index += 1;
      }
      blocks.push({ kind: 'list', ordered, items });
      continue;
    }
    const paragraph = [line.trim()];
    index += 1;
    while (
      index < lines.length &&
      lines[index]?.trim() &&
      !/^(#{1,6})\s|^>|^\s*(?:[-*+]\s|\d+\.\s)|^```/.test(lines[index] ?? '')
    )
      paragraph.push((lines[index++] ?? '').trim());
    blocks.push({ kind: 'paragraph', text: paragraph.join(' ') });
  }
  return blocks;
}

@Component({
  selector: 'app-markdown-inline',
  template: `@for (token of tokens(); track $index) {
    @switch (token.kind) {
      @case ('strong') {
        <strong>{{ token.text }}</strong>
      }
      @case ('emphasis') {
        <em>{{ token.text }}</em>
      }
      @case ('strike') {
        <del>{{ token.text }}</del>
      }
      @case ('code') {
        <code>{{ token.text }}</code>
      }
      @case ('link') {
        <a [href]="token.href" target="_blank" rel="noopener noreferrer">{{ token.text }}</a>
      }
      @default {
        {{ token.text }}
      }
    }
  }`,
})
export class MarkdownInlineComponent {
  readonly text = input('');
  readonly tokens = computed(() => markdownInline(this.text()));
}

@Component({
  selector: 'app-markdown-viewer',
  imports: [MarkdownInlineComponent],
  template: `<div class="markdown-viewer">
    @for (block of blocks(); track $index) {
      @switch (block.kind) {
        @case ('heading') {
          @switch (block.level) {
            @case (1) {
              <h2><app-markdown-inline [text]="block.text" /></h2>
            }
            @case (2) {
              <h3><app-markdown-inline [text]="block.text" /></h3>
            }
            @default {
              <h4><app-markdown-inline [text]="block.text" /></h4>
            }
          }
        }
        @case ('quote') {
          <blockquote><app-markdown-inline [text]="block.text" /></blockquote>
        }
        @case ('code') {
          <pre><code>{{ block.text }}</code></pre>
        }
        @case ('list') {
          @if (block.ordered) {
            <ol>
              @for (item of block.items; track $index) {
                <li [style.margin-inline-start.rem]="item.depth">
                  <app-markdown-inline [text]="item.text" />
                </li>
              }
            </ol>
          } @else {
            <ul>
              @for (item of block.items; track $index) {
                <li [class.checklist-item]="item.checked !== null" [style.margin-inline-start.rem]="item.depth">
                  @if (item.checked !== null) {
                    <input type="checkbox" [checked]="item.checked" disabled aria-label="Checklist item" />
                  }
                  <app-markdown-inline [text]="item.text" />
                </li>
              }
            </ul>
          }
        }
        @default {
          <p><app-markdown-inline [text]="block.text" /></p>
        }
      }
    }
  </div>`,
})
export class MarkdownViewerComponent {
  readonly markdown = input('');
  readonly blocks = computed(() => markdownBlocks(this.markdown()));
}
