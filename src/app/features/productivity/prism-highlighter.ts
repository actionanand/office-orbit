import type Prism from 'prismjs';

export interface HighlightedCodeBlock {
  code: HTMLElement;
  language: string;
  label: string;
  source: string;
}

const LANGUAGE_ALIASES: Readonly<Record<string, string>> = {
  javascript: 'javascript',
  js: 'javascript',
  typescript: 'typescript',
  ts: 'typescript',
  html: 'markup',
  markup: 'markup',
  css: 'css',
  json: 'json',
  bash: 'bash',
  shell: 'bash',
  sh: 'bash',
  text: 'plaintext',
  plaintext: 'plaintext',
  plain: 'plaintext',
};

const LANGUAGE_LABELS: Readonly<Record<string, string>> = {
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  markup: 'HTML',
  css: 'CSS',
  json: 'JSON',
  bash: 'Bash',
  plaintext: 'Plain text',
};

let prismPromise: Promise<typeof Prism> | undefined;

export function normalizePrismLanguage(value: string): string | null {
  return LANGUAGE_ALIASES[value.trim().toLowerCase()] ?? null;
}

export async function highlightMarkdownCode(host: HTMLElement): Promise<HighlightedCodeBlock[]> {
  const candidates = [...host.querySelectorAll<HTMLElement>('pre > code[class*="language-"]')].filter(
    code => !code.classList.contains('language-mermaid'),
  );
  if (!candidates.length) return [];
  const prism = await loadPrism();
  const blocks: HighlightedCodeBlock[] = [];
  for (const code of candidates) {
    const sourceLanguage = [...code.classList].find(name => name.startsWith('language-'))?.slice('language-'.length);
    const language = normalizePrismLanguage(sourceLanguage ?? '');
    if (!language) continue;
    const source = code.textContent ?? '';
    for (const className of [...code.classList]) {
      if (className.startsWith('language-')) code.classList.remove(className);
    }
    code.classList.add(`language-${language}`);
    code.parentElement?.classList.add(`language-${language}`);
    if (language !== 'plaintext' && prism.languages[language]) prism.highlightElement(code);
    blocks.push({ code, language, label: LANGUAGE_LABELS[language], source });
  }
  return blocks;
}

async function loadPrism(): Promise<typeof Prism> {
  prismPromise ??= (async () => {
    const prism = (await import('prismjs')).default;
    prism.manual = true;
    await import('prismjs/components/prism-markup.js');
    await import('prismjs/components/prism-css.js');
    await import('prismjs/components/prism-clike.js');
    await import('prismjs/components/prism-javascript.js');
    await import('prismjs/components/prism-typescript.js');
    await import('prismjs/components/prism-json.js');
    await import('prismjs/components/prism-bash.js');
    return prism;
  })();
  return prismPromise;
}
