import { Component, ElementRef, computed, effect, inject, input, signal, viewChild } from '@angular/core';
import { Marked, Renderer } from 'marked';
import { addIcons } from 'ionicons';
import { copyOutline } from 'ionicons/icons';
import { SnackbarService } from '../../core/notifications/snackbar.service';
import { normalizeNotionMarkdown } from './notion-markdown-normalizer';
import { highlightMarkdownCode } from './prism-highlighter';

interface PreparedMarkdown {
  source: string;
  formulas: Array<{ value: string; display: boolean }>;
}

const renderer = new Renderer();
renderer.checkbox = ({ checked }) =>
  `<span class="markdown-checkbox${checked ? ' checked' : ''}" role="checkbox" aria-checked="${checked}" aria-disabled="true">${checked ? '✓' : ''}</span>`;

const markdownParser = new Marked({
  gfm: true,
  breaks: false,
  renderer,
});

export function safeMarkdownUrl(value: string): string | null {
  const trimmed = value.trim();
  return /^(https?:|mailto:)/i.test(trimmed) || /^(\/|#)/.test(trimmed) ? trimmed : null;
}

export function prepareMarkdown(markdown: string): PreparedMarkdown {
  const formulas: PreparedMarkdown['formulas'] = [];
  const lines = normalizeNotionMarkdown(markdown).split('\n');
  const prepared: string[] = [];
  let fenced = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      fenced = !fenced;
      prepared.push(line);
      continue;
    }
    if (fenced) {
      prepared.push(line);
      continue;
    }

    const blockStart = /^(\s*(?:>\s*)*)\$\$\s*$/.exec(line);
    if (blockStart) {
      const prefix = blockStart[1];
      const value: string[] = [];
      while (index + 1 < lines.length) {
        const next = lines[index + 1];
        index += 1;
        if ((prefix && next.startsWith(prefix) ? next.slice(prefix.length) : next).trim() === '$$') break;
        value.push(prefix && next.startsWith(prefix) ? next.slice(prefix.length) : next.trimStart());
      }
      prepared.push(prefix + mathPlaceholder(formulas, value.join('\n').trim(), true));
      continue;
    }

    const block = /^(\s*(?:>\s*)*)\$\$(.+)\$\$\s*$/.exec(line);
    prepared.push(
      block ? block[1] + mathPlaceholder(formulas, block[2].trim(), true) : replaceMathOutsideCode(line, formulas),
    );
  }
  return { source: prepared.join('\n'), formulas };
}

function replaceMathOutsideCode(line: string, formulas: PreparedMarkdown['formulas']): string {
  return line
    .split(/(`[^`]*`)/g)
    .map(segment =>
      segment.startsWith('`')
        ? segment
        : segment.replace(
            /(^|[^\\$])\$([^$\n]+?)\$/g,
            (_match, prefix: string, value: string) => prefix + mathPlaceholder(formulas, value, false),
          ),
    )
    .join('');
}

function mathPlaceholder(formulas: PreparedMarkdown['formulas'], value: string, display: boolean): string {
  const index = formulas.push({ value, display }) - 1;
  return display
    ? '<div class="markdown-math markdown-math-block markdown-math-' + index + '"></div>'
    : '<span class="markdown-math markdown-math-' + index + '"></span>';
}

export function renderMarkdown(markdown: string): {
  html: string;
  formulas: PreparedMarkdown['formulas'];
  failed: boolean;
} {
  const prepared = prepareMarkdown(markdown);
  try {
    return {
      html: markdownParser.parse(prepared.source, { async: false }) as string,
      formulas: prepared.formulas,
      failed: false,
    };
  } catch {
    return { html: '', formulas: [], failed: true };
  }
}

@Component({
  selector: 'app-markdown-viewer',
  host: {
    '(click)': 'handleClick($event)',
  },
  template: `<div #host class="markdown-viewer" [innerHTML]="rendered().html"></div>
    @if (renderError()) {
      <p class="content-warning" role="alert">{{ renderError() }}</p>
    }
    @if (rendered().failed) {
      <pre class="markdown-source"><code>{{ markdown() }}</code></pre>
    }`,
})
export class MarkdownViewerComponent {
  readonly markdown = input('');
  readonly rendered = computed(() => renderMarkdown(this.markdown()));
  readonly renderError = signal('');
  private readonly host = viewChild<ElementRef<HTMLElement>>('host');
  private readonly snackbar = inject(SnackbarService);
  private readonly codeSources = new WeakMap<HTMLButtonElement, string>();
  private generation = 0;

  constructor() {
    addIcons({ copyOutline });
    effect(() => {
      const host = this.host()?.nativeElement;
      const value = this.rendered();
      if (!host) return;
      if (value.failed) {
        this.renderError.set('Markdown could not be rendered. The original source is shown.');
        return;
      }
      const generation = ++this.generation;
      window.setTimeout(() => void this.enhance(host, value.formulas, generation));
    });
  }

  private async enhance(host: HTMLElement, formulas: PreparedMarkdown['formulas'], generation: number): Promise<void> {
    this.renderError.set('');
    this.secureLinks(host);
    this.prepareRichContent(host);
    await this.highlightCode(host, generation);
    await this.renderMath(host, formulas, generation);
    await this.renderDiagrams(host, generation);
  }

  protected async handleClick(event: Event): Promise<void> {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLButtonElement>('.markdown-code-copy');
    if (!button) return;
    const source = this.codeSources.get(button);
    if (source === undefined) return;
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(source);
      else this.copyWithSelection(source);
      this.snackbar.success('Code copied.');
    } catch {
      this.snackbar.error('The code could not be copied.');
    }
  }

  private async highlightCode(host: HTMLElement, generation: number): Promise<void> {
    try {
      const blocks = await highlightMarkdownCode(host);
      if (generation !== this.generation) return;
      for (const block of blocks) this.decorateCodeBlock(block.code, block.label, block.source);
    } catch {
      // Highlighting is progressive enhancement; readable source remains in place.
    }
  }

  private decorateCodeBlock(code: HTMLElement, label: string, source: string): void {
    const pre = code.parentElement;
    if (!pre || pre.parentElement?.classList.contains('markdown-code-block')) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'markdown-code-block';
    const header = document.createElement('div');
    header.className = 'markdown-code-header';
    const language = document.createElement('span');
    language.textContent = label;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'markdown-code-copy';
    button.setAttribute('aria-label', `Copy ${label} code`);
    const icon = document.createElement('ion-icon');
    icon.setAttribute('name', 'copy-outline');
    icon.setAttribute('aria-hidden', 'true');
    button.append(icon, document.createTextNode('Copy'));
    this.codeSources.set(button, source);
    header.append(language, button);
    pre.before(wrapper);
    wrapper.append(header, pre);
  }

  private copyWithSelection(value: string): void {
    const field = document.createElement('textarea');
    field.value = value;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();
    const copied = document.execCommand('copy');
    field.remove();
    if (!copied) throw new Error('Copy was not available.');
  }

  private prepareRichContent(host: HTMLElement): void {
    for (const table of host.querySelectorAll('table')) {
      if (table.parentElement?.classList.contains('markdown-table-scroll')) continue;
      const wrapper = document.createElement('div');
      wrapper.className = 'markdown-table-scroll';
      wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region');
      wrapper.setAttribute('aria-label', 'Scrollable table');
      table.before(wrapper);
      wrapper.append(table);
    }
    for (const image of host.querySelectorAll('img')) {
      image.loading = 'lazy';
      image.decoding = 'async';
    }
  }

  private secureLinks(host: HTMLElement): void {
    for (const link of host.querySelectorAll('a')) {
      const safe = safeMarkdownUrl(link.getAttribute('href') ?? '');
      if (!safe) {
        link.removeAttribute('href');
        continue;
      }
      if (/^https?:/i.test(safe)) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
    }
  }

  private async renderMath(
    host: HTMLElement,
    formulas: PreparedMarkdown['formulas'],
    generation: number,
  ): Promise<void> {
    const targets = [...host.querySelectorAll<HTMLElement>('.markdown-math')];
    if (!targets.length) return;
    try {
      const katex = await import('katex');
      if (generation !== this.generation) return;
      for (const target of targets) {
        const formula = formulas[this.mathIndex(target)];
        if (!formula) continue;
        try {
          katex.default.render(formula.value, target, {
            displayMode: formula.display,
            throwOnError: false,
            strict: 'warn',
            trust: false,
          });
        } catch {
          this.showFormula(target, formula);
          target.classList.add('markdown-render-failed');
        }
      }
    } catch {
      for (const target of targets) {
        const formula = formulas[this.mathIndex(target)];
        if (formula) this.showFormula(target, formula);
      }
      this.renderError.set('Math could not be rendered. The original formula is shown.');
    }
  }

  private showFormula(target: HTMLElement, formula: { value: string; display: boolean }): void {
    target.textContent = formula.display ? '$$\n' + formula.value + '\n$$' : '$' + formula.value + '$';
  }

  private mathIndex(target: HTMLElement): number {
    const indexClass = [...target.classList].find(name => /^markdown-math-\d+$/.test(name));
    return Number(indexClass?.slice('markdown-math-'.length) ?? -1);
  }

  private async renderDiagrams(host: HTMLElement, generation: number): Promise<void> {
    const blocks = [...host.querySelectorAll<HTMLElement>('pre > code.language-mermaid')];
    if (!blocks.length) return;
    try {
      const mermaid = (await import('mermaid')).default;
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', flowchart: { htmlLabels: false } });
      for (const [index, code] of blocks.entries()) {
        if (generation !== this.generation) return;
        try {
          const id = 'office-orbit-mermaid-' + generation + '-' + index + '-' + crypto.randomUUID();
          const result = await mermaid.render(id, code.textContent ?? '');
          if (generation !== this.generation) return;
          const container = document.createElement('div');
          container.className = 'markdown-mermaid';
          container.setAttribute('role', 'img');
          container.setAttribute('aria-label', 'Mermaid diagram');
          container.append(this.safeSvg(result.svg));
          code.parentElement?.replaceWith(container);
        } catch {
          this.diagramFallback(code, 'This diagram could not be rendered. Its source is shown.');
        }
      }
    } catch {
      for (const code of blocks) this.diagramFallback(code, 'Mermaid is unavailable. The diagram source is shown.');
    }
  }

  private safeSvg(source: string): SVGElement {
    const value = new DOMParser().parseFromString(source, 'image/svg+xml');
    const svg = value.documentElement;
    if (svg.localName !== 'svg' || svg.querySelector('parsererror')) throw new Error('Invalid Mermaid SVG.');
    for (const element of [...svg.querySelectorAll('*')]) {
      if (['script', 'iframe', 'object', 'embed'].includes(element.localName)) {
        element.remove();
        continue;
      }
      for (const attribute of [...element.attributes]) {
        const name = attribute.name.toLowerCase();
        const attributeValue = attribute.value.trim();
        if (
          name.startsWith('on') ||
          ((name === 'href' || name.endsWith(':href')) && !/^(#|data:image\/)/i.test(attributeValue))
        )
          element.removeAttribute(attribute.name);
      }
    }
    svg.removeAttribute('style');
    svg.setAttribute('width', '100%');
    svg.setAttribute('height', 'auto');
    return document.importNode(svg, true) as unknown as SVGElement;
  }

  private diagramFallback(code: HTMLElement, message: string): void {
    const warning = document.createElement('p');
    warning.className = 'markdown-diagram-error';
    warning.setAttribute('role', 'alert');
    warning.textContent = message;
    code.parentElement?.before(warning);
  }
}
