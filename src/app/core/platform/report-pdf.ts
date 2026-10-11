import type { ReportTextRun, WorkLogReport } from '../../features/work-logs/work-log-report';
import { formatDate, formatDateRange } from '../../shared/utils/format';
import { markdownFieldBlocks, markdownInline } from './report-markdown';

interface PdfPage {
  commands: string[];
  y: number;
  links: { rect: number[]; href: string }[];
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;
const CONTENT_BOTTOM = 790;

/** Creates a compact PDF with a real text layer so report content remains selectable and searchable. */
export async function reportPdf(report: WorkLogReport): Promise<Blob> {
  return styledReportPdf(report);
}

const INK = '0.13 0.18 0.22';
const MUTED = '0.36 0.41 0.44';
const GREEN = '0.09 0.39 0.25';
const SOFT = '0.93 0.96 0.94';

/** A4 editorial layout with grouped sections and incremental pagination for long histories. */
function styledReportPdf(report: WorkLogReport): Blob {
  const pages: PdfPage[] = [];
  let page = createPage(pages);
  let section = '';
  const isJira = report.layout === 'jira';
  const key = isJira ? (report.summary?.[0]?.value ?? '') : 'Work Log Report';
  const sectionLabel = (value: string) => (isJira ? value : formatDate(value) || value || 'Undated entries');
  const text = (value: string, x: number, y: number, size = 10, font = 'F1', color = INK) =>
    page.commands.push(
      `BT /${font} ${size} Tf ${color} rg 1 0 0 1 ${x} ${PAGE_HEIGHT - y} Tm (${pdfText(value)}) Tj ET`,
    );
  const rect = (x: number, y: number, width: number, height: number, color: string) =>
    page.commands.push(`${color} rg ${x} ${PAGE_HEIGHT - y - height} ${width} ${height} re f`);
  const band = (label: string) => {
    rect(MARGIN, page.y - 12, PAGE_WIDTH - 2 * MARGIN, 27, SOFT);
    rect(MARGIN, page.y - 12, 3, 27, GREEN);
    text(label, MARGIN + 12, page.y + 5, 12, 'F2', GREEN);
    page.y += 33;
  };
  const ensure = (height: number, repeatSection = true) => {
    if (page.y + height <= CONTENT_BOTTOM - 10) return;
    page = createPage(pages);
    text(isJira ? 'OFFICE ORBIT  /  JIRA DETAIL' : 'OFFICE ORBIT  /  WORK LOG', MARGIN, 28, 8, 'F2', GREEN);
    text(key, PAGE_WIDTH - MARGIN - textWidth(key, 9), 28, 9, 'F1', MUTED);
    rect(MARGIN, 36, PAGE_WIDTH - MARGIN * 2, 1, SOFT);
    page.y = 65;
    if (section && repeatSection) band(sectionLabel(section) + ' (continued)');
  };
  const draw = (
    value: string,
    options: {
      size?: number;
      font?: string;
      color?: string;
      inset?: number;
      background?: boolean;
      runs?: ReportTextRun[];
      marker?: string;
    } = {},
  ) => {
    const size = options.size ?? 10.5;
    const inset = options.inset ?? 0;
    const height = size * 1.5;
    const lines = wrapRuns(
      options.runs ?? [{ text: value, ...(options.font === 'F3' ? { code: true } : {}) }],
      PAGE_WIDTH - MARGIN * 2 - inset - 12,
      size,
      options.font,
    );
    for (const [index, line] of lines.entries()) {
      ensure(height + 6);
      if (options.background)
        rect(MARGIN + inset - 6, page.y - size - 2, PAGE_WIDTH - MARGIN * 2 - inset + 6, height, '0.96 0.97 0.98');
      drawRuns(line, MARGIN + inset, page.y, size, options.font, options.color);
      if (index === 0 && options.marker) {
        const markerWidth = glyphWidth(options.marker, size, options.font ?? 'F1');
        text(options.marker, MARGIN + inset - markerWidth - 5, page.y, size, options.font, options.color);
      }
      page.y += height;
    }
  };
  const drawRuns = (runs: ReportTextRun[], x: number, y: number, size: number, font = 'F1', color = INK) => {
    for (const run of runs) {
      const runFont = runFontName(run, font);
      const width = glyphWidth(run.text, size, runFont);
      const href = run.href && /^(https?:\/\/|mailto:)/i.test(run.href) ? run.href : undefined;
      if (run.code) rect(x, y - size, width, size + 3, '0.94 0.95 0.96');
      text(run.text, x, y, size, runFont, href ? '0.04 0.30 0.62' : color);
      if (href) {
        rect(x, y + 2, width, 0.5, '0.04 0.30 0.62');
        page.links.push({ rect: [x, PAGE_HEIGHT - y - 3, x + width, PAGE_HEIGHT - y + size], href });
      }
      if (run.strike) rect(x, y - size * 0.3, width, 0.6, color);
      x += width;
    }
  };
  text('OFFICE ORBIT', MARGIN, 47, 11, 'F2', GREEN);
  text(isJira ? 'JIRA DETAIL REPORT' : 'ACTIVITY REPORT', MARGIN, 67, 9, 'F1', MUTED);
  page.y = 100;
  const title = isJira ? report.records[0]?.title || key : (report.title ?? 'Work Log Report');
  draw(title, { size: 22, font: 'F2', runs: markdownInline(title) });
  page.y += 5;
  if (isJira) {
    draw(key + '  |  Generated ' + report.generated, { size: 9, color: MUTED });
  } else {
    const dates = /^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/.exec(report.period);
    draw(dates ? formatDateRange(dates[1], dates[2]) : report.period, { size: 12, color: GREEN, font: 'F2' });
    page.y += 4;
    const days = new Set(report.records.map(record => record.date).filter(Boolean)).size;
    draw(
      `${report.records.length} ${report.records.length === 1 ? 'entry' : 'entries'}  |  ${days} ${days === 1 ? 'day' : 'days'} with activity`,
      { size: 9.5, color: MUTED },
    );
    draw('Categories: ' + report.categories, { size: 9, color: MUTED });
    draw('Generated: ' + report.generated, { size: 9, color: MUTED });
  }
  page.y += 19;

  for (const record of report.records) {
    const newSection = section !== record.date || record === report.records[0];
    const recordBlocks = record.blocks ?? record.lines.flatMap(markdownFieldBlocks);
    const estimatedHeight =
      25 +
      wrapMeasured(record.title, PAGE_WIDTH - MARGIN * 2 - 12, 12).length * 18 +
      recordBlocks.reduce(
        (height, block) => height + wrapMeasured(block.text, PAGE_WIDTH - MARGIN * 2 - 24, 10.5).length * 17 + 8,
        0,
      );
    // Keep compact cards together, while allowing long narratives to flow across pages.
    ensure((estimatedHeight < 330 ? estimatedHeight : 65) + (newSection ? 33 : 12), !newSection);
    if (newSection) {
      section = record.date;
      band(sectionLabel(section));
    } else {
      rect(MARGIN, page.y - 5, PAGE_WIDTH - MARGIN * 2, 0.6, '0.85 0.89 0.87');
      page.y += 12;
    }
    if (isJira && section === 'Overview') {
      // Two-column facts create a compact summary without mixing labels and values.
      const cellWidth = (PAGE_WIDTH - MARGIN * 2 - 24) / 2;
      for (let index = 0; index < record.lines.length; index += 2) {
        const cells = record.lines.slice(index, index + 2).map(line => {
          const colon = line.indexOf(':');
          return {
            label: line.slice(0, colon),
            lines: wrapMeasured(line.slice(colon + 1).trim(), cellWidth - 8, 10.5),
          };
        });
        const height = 16 + Math.max(...cells.map(cell => cell.lines.length)) * 16 + 12;
        ensure(height);
        cells.forEach((cell, column) => {
          const x = MARGIN + column * (cellWidth + 24);
          text(cell.label, x, page.y, 8.5, 'F1', MUTED);
          cell.lines.forEach((line, row) => text(line, x, page.y + 17 + row * 16, 10.5, 'F2'));
        });
        page.y += height;
      }
    } else {
      if (record.title) {
        ensure(wrapMeasured(record.title, PAGE_WIDTH - MARGIN * 2 - 12, 12).length * 18 + 35);
        draw(record.title, { size: 12, font: 'F2', runs: markdownInline(record.title) });
        page.y += 5;
      }
      for (const block of recordBlocks) {
        if (block.kind === 'rule') {
          ensure(15);
          rect(MARGIN, page.y, PAGE_WIDTH - MARGIN * 2, 0.6, SOFT);
          page.y += 15;
          continue;
        }
        if (block.kind === 'table' && block.cells?.length) {
          const cellWidth = (PAGE_WIDTH - MARGIN * 2) / block.cells.length;
          const cells = block.cells.map((cell, index) =>
            wrapRuns(block.cellRuns?.[index] ?? [{ text: cell }], cellWidth - 16, 9, block.header ? 'F2' : 'F1'),
          );
          const count = Math.max(...cells.map(cell => cell.length));
          const height = count * 14 + 12;
          for (let row = 0; row < count; row++) {
            ensure(row === 0 && height < 650 ? height : 20);
            rect(MARGIN, page.y - 10, PAGE_WIDTH - MARGIN * 2, 16, block.header ? SOFT : '0.97 0.98 0.98');
            cells.forEach((cell, column) =>
              drawRuns(
                cell[row] ?? [],
                MARGIN + column * cellWidth + 8,
                page.y,
                9,
                block.header ? 'F2' : 'F1',
                block.header ? GREEN : INK,
              ),
            );
            page.y += 14;
          }
        } else if (block.kind === 'heading') {
          ensure(50);
          page.y += 5;
          draw(block.text, {
            runs: block.runs,
            size: block.level === 1 ? 17 : block.level === 2 ? 14 : 12,
            font: 'F2',
            color: GREEN,
          });
        } else if (block.kind === 'code') {
          draw(block.text, { size: 9, font: 'F3', inset: 10, background: true });
        } else if (block.kind === 'quote') {
          draw(block.text, { runs: block.runs, font: 'F4', color: MUTED, inset: 12, background: true });
        } else if (block.kind === 'bullet') {
          const prefix = /^(•|\d+\.|\[[ x]\])\s+/.exec(block.text);
          const marker = prefix?.[1];
          const value = block.text.slice(prefix?.[0].length ?? 0);
          const runs = block.runs?.map((run, index) =>
            index === 0 ? { ...run, text: run.text.slice(prefix?.[0].length ?? 0) } : run,
          );
          draw(value, {
            runs,
            marker,
            inset: 10 + (block.level ?? 0) * 16 + (marker ? Math.max(12, glyphWidth(marker, 10.5, 'F1') + 5) : 0),
          });
        } else {
          const metadata =
            /^(Activity|Work|JIRAs|Date|Status|Deployment|Version|Branch|Linked|Resolved|Created|Last updated|Formal announced|Confirmed release|Planned):/.test(
              block.text,
            );
          draw(block.text, {
            runs: block.runs,
            color: metadata || !isJira ? MUTED : INK,
            size: metadata || !isJira ? 9.5 : 10.5,
          });
        }
        page.y += block.kind === 'bullet' ? 3 : 7;
      }
    }
    page.y += 12;
  }
  pages.forEach((entry, index) => {
    page = entry;
    rect(MARGIN, 805, PAGE_WIDTH - MARGIN * 2, 0.6, SOFT);
    text('Office Orbit  |  ' + key, MARGIN, 823, 8, 'F1', MUTED);
    const count = `${index + 1} / ${pages.length}`;
    text(count, PAGE_WIDTH - MARGIN - textWidth(count, 8), 823, 8, 'F1', MUTED);
  });
  return pdfBlob(pages);
}

// Standard Helvetica glyph advances (PDF's built-in font); use bold widths conservatively.
const ADVANCES = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 278, 278, 584, 584, 584, 556, 1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556, 333, 556, 556, 500, 556,
  556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556, 556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334,
  260, 334, 584,
];
const BOLD_ADVANCES = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278, 556, 556, 556, 556, 556, 556, 556,
  556, 556, 556, 333, 333, 584, 584, 584, 611, 975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833,
  722, 778, 667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556, 333, 556, 611, 556, 611,
  556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611, 611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389,
  280, 389, 584,
];
function glyphWidth(value: string, size: number, font: string): number {
  const advances = font === 'F2' || font === 'F5' ? BOLD_ADVANCES : ADVANCES;
  const printable = pdfText(value)
    .replace(/\\225/g, '•')
    .replace(/\\([\\()])/g, '$1');
  return (
    ([...printable].reduce(
      (width, character) =>
        width + (font === 'F3' ? 600 : character === '•' ? 350 : (advances[character.charCodeAt(0) - 32] ?? 600)),
      0,
    ) *
      size) /
    1000
  );
}
function textWidth(value: string, size: number, mono = false): number {
  return (
    (([...value].reduce(
      (width, character) => width + (mono ? 600 : (ADVANCES[character.charCodeAt(0) - 32] ?? 600)),
      0,
    ) *
      size) /
      1000) *
    1.08
  );
}
function wrapMeasured(value: string, width: number, size: number, mono = false): string[] {
  const output: string[] = [];
  for (const paragraph of value.replace(/\r/g, '').split('\n')) {
    let rest = paragraph;
    while (textWidth(rest, size, mono) > width) {
      let end = 1;
      while (end < rest.length && textWidth(rest.slice(0, end + 1), size, mono) <= width) end++;
      const space = rest.lastIndexOf(' ', end);
      if (space > 0) end = space;
      output.push(rest.slice(0, end));
      rest = rest.slice(end).trimStart();
    }
    output.push(rest);
  }
  return output;
}

/** Wrap styled spans without discarding their formatting or link targets. */
function runFontName(run: ReportTextRun, fallback: string): string {
  return run.code ? 'F3' : run.bold && run.italic ? 'F5' : run.bold ? 'F2' : run.italic ? 'F4' : fallback;
}
function wrapRuns(runs: ReportTextRun[], width: number, size: number, font = 'F1'): ReportTextRun[][] {
  const lines: ReportTextRun[][] = [[]];
  let used = 0;
  const newline = () => {
    lines.push([]);
    used = 0;
  };
  const append = (run: ReportTextRun, text: string) => {
    const line = lines[lines.length - 1];
    const previous = line.at(-1);
    if (
      previous &&
      previous.bold === run.bold &&
      previous.italic === run.italic &&
      previous.code === run.code &&
      previous.strike === run.strike &&
      previous.href === run.href
    )
      previous.text += text;
    else line.push({ ...run, text });
    used += glyphWidth(text, size, runFontName(run, font));
  };
  for (const run of runs) {
    for (const part of run.text
      .replace(/\r/g, '')
      .split(/(\n|[^\S\n]+|[^\s]+)/)
      .filter(Boolean)) {
      if (part === '\n') {
        newline();
        continue;
      }
      if (used > 0 && used + glyphWidth(part, size, runFontName(run, font)) > width) newline();
      if (!used && /^\s+$/.test(part) && !run.code) continue;
      // Split unbroken URLs/code tokens so they cannot overflow the page or table cell.
      let fragment = '';
      for (const character of part) {
        if (used + glyphWidth(fragment + character, size, runFontName(run, font)) > width && fragment) {
          append(run, fragment);
          newline();
          fragment = '';
        }
        fragment += character;
      }
      if (fragment) append(run, fragment);
    }
  }
  return lines;
}

function createPage(pages: PdfPage[]): PdfPage {
  const page: PdfPage = { commands: [], links: [], y: 48 };
  pages.push(page);
  return page;
}

function pdfText(value: string): string {
  return (
    value
      .replace(/[\u2010-\u2015]/g, '-')
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201c\u201d]/g, '"')
      .replace(/\u2026/g, '...')
      .replace(/\u00b7/g, '|')
      .replace(/\u2192/g, '->')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\x20-\x7e\u2022]/g, '?')
      .replace(/([\\()])/g, '\\$1')
      // WinAnsi's bullet is byte 149. Keep the PDF stream ASCII using an octal escape.
      .replace(/\u2022/g, '\\225')
  );
}

function pdfBlob(pages: PdfPage[]): Blob {
  const fontRegular = 3 + pages.length * 2;
  const fontBold = fontRegular + 1;
  const objects: string[] = [];
  let annotationId = fontRegular + 5;
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] =
    `<< /Type /Pages /Count ${pages.length} /Kids [` +
    pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ') +
    '] >>';
  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const stream = page.commands.join('\n');
    const annotations = page.links.map(link => {
      const id = annotationId++;
      const uri = new TextEncoder().encode(link.href);
      const hex = [...uri].map(byte => byte.toString(16).padStart(2, '0')).join('');
      objects[id] =
        `<< /Type /Annot /Subtype /Link /Rect [${link.rect.join(' ')}] /Border [0 0 0] /A << /S /URI /URI <${hex}> >> >>`;
      return `${id} 0 R`;
    });
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R /F3 ${fontBold + 1} 0 R /F4 ${fontBold + 2} 0 R /F5 ${fontBold + 3} 0 R >> >> /Contents ${contentId} 0 R /Annots [${annotations.join(' ')}] >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontRegular] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[fontBold] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objects[fontBold + 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
  objects[fontBold + 2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>';
  objects[fontBold + 3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-BoldOblique /Encoding /WinAnsiEncoding >>';

  let output = '%PDF-1.4\n%OfficeOrbit\n';
  const offsets = Array<number>(objects.length).fill(0);
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = output.length;
    output += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xref = output.length;
  output += `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (const offset of offsets.slice(1)) output += `${String(offset).padStart(10, '0')} 00000 n \n`;
  output += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([new TextEncoder().encode(output)], { type: 'application/pdf' });
}
