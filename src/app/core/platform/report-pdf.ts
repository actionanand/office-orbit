import type { ReportBlock, WorkLogReport } from '../../features/work-logs/work-log-report';
import { formatDate, formatDateRange } from '../../shared/utils/format';

interface PdfPage {
  commands: string[];
  y: number;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 42;
const CONTENT_BOTTOM = 790;

/** Creates a compact PDF with a real text layer so report content remains selectable and searchable. */
export async function reportPdf(report: WorkLogReport): Promise<Blob> {
  if (report.layout) return styledReportPdf(report);
  const pages: PdfPage[] = [];
  let page = createPage(pages);

  const ensureSpace = (height: number) => {
    if (page.y + height <= CONTENT_BOTTOM) return;
    page = createPage(pages);
  };
  const draw = (value: string, options: { bold?: boolean; size?: number; color?: string } = {}) => {
    const size = options.size ?? 11;
    const lineHeight = Math.ceil(size * 1.45);
    const lines = wrapText(value, Math.max(20, Math.floor((PAGE_WIDTH - MARGIN * 2) / (size * 0.52))));
    for (const line of lines) {
      ensureSpace(lineHeight);
      page.commands.push(
        `BT /${options.bold ? 'F2' : 'F1'} ${size} Tf ${options.color ?? '0.09 0.17 0.13'} rg 1 0 0 1 ${MARGIN} ${PAGE_HEIGHT - page.y} Tm (${pdfText(line)}) Tj ET`,
      );
      page.y += lineHeight;
    }
  };
  const gap = (height: number) => {
    ensureSpace(height);
    page.y += height;
  };

  draw('Office Orbit', { bold: true, size: 18, color: '0.09 0.39 0.25' });
  draw(report.title ?? 'Work Log Report', { size: 13 });
  gap(8);
  for (const field of report.summary ?? [
    { label: 'Period', value: report.period },
    { label: 'Categories', value: report.categories },
  ])
    draw(field.label + ': ' + field.value);
  draw('Generated: ' + report.generated);
  gap(14);

  for (const record of report.records) {
    const estimatedLines = [record.date, record.title, ...record.lines].reduce(
      (count, value) => count + wrapText(value, 86).length,
      0,
    );
    if (estimatedLines < 36) ensureSpace(estimatedLines * 16 + 14);
    draw(record.date, { bold: true, size: 10, color: '0.27 0.35 0.30' });
    draw(record.title, { bold: true, size: 12 });
    for (const line of record.lines) draw(line);
    gap(12);
  }

  pages.forEach((entry, index) => {
    entry.commands.push(
      `BT /F1 9 Tf 0.27 0.35 0.30 rg 1 0 0 1 ${MARGIN} 24 Tm (Office Orbit  |  Page ${index + 1}) Tj ET`,
    );
  });
  return pdfBlob(pages);
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
    options: { size?: number; font?: string; color?: string; inset?: number; background?: boolean } = {},
  ) => {
    const size = options.size ?? 10.5;
    const inset = options.inset ?? 0;
    const height = size * 1.5;
    const lines = wrapMeasured(value, PAGE_WIDTH - MARGIN * 2 - inset - 12, size, options.font === 'F3');
    for (const line of lines) {
      ensure(height + 6);
      if (options.background)
        rect(MARGIN + inset - 6, page.y - size - 2, PAGE_WIDTH - MARGIN * 2 - inset + 6, height, '0.96 0.97 0.98');
      text(line, MARGIN + inset, page.y, size, options.font ?? 'F1', options.color ?? INK);
      page.y += height;
    }
  };
  text('OFFICE ORBIT', MARGIN, 47, 11, 'F2', GREEN);
  text(isJira ? 'JIRA DETAIL REPORT' : 'ACTIVITY REPORT', MARGIN, 67, 9, 'F1', MUTED);
  page.y = 100;
  draw(isJira ? report.records[0]?.title || key : 'Work Log Report', { size: 22, font: 'F2' });
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
    const recordBlocks = record.blocks ?? record.lines.map(value => ({ kind: 'text', text: value }) as ReportBlock);
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
        draw(record.title, { size: 12, font: 'F2' });
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
          const cells = block.cells.map(cell => wrapMeasured(cell, cellWidth - 16, 9));
          const count = Math.max(...cells.map(cell => cell.length));
          const height = count * 14 + 12;
          for (let row = 0; row < count; row++) {
            ensure(row === 0 && height < 650 ? height : 20);
            rect(MARGIN, page.y - 10, PAGE_WIDTH - MARGIN * 2, 16, block.header ? SOFT : '0.97 0.98 0.98');
            cells.forEach((cell, column) =>
              text(
                cell[row] ?? '',
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
          draw(block.text, { size: block.level === 1 ? 17 : block.level === 2 ? 14 : 12, font: 'F2', color: GREEN });
        } else if (block.kind === 'code') {
          draw(block.text, { size: 9, font: 'F3', inset: 10, background: true });
        } else if (block.kind === 'quote') {
          draw(block.text, { font: 'F4', color: MUTED, inset: 12, background: true });
        } else if (block.kind === 'bullet') {
          draw(block.text, { inset: 10 + (block.level ?? 0) * 10 });
        } else {
          if (!isJira && /^(Comment|Went wrong):/.test(block.text)) {
            const colon = block.text.indexOf(':');
            ensure(45);
            draw(block.text.slice(0, colon), { size: 9, font: 'F2', color: MUTED });
            page.y += 3;
            draw(block.text.slice(colon + 1).trim(), { size: 10, inset: 10, background: true });
            page.y += 7;
            continue;
          }
          const metadata =
            /^(Activity|Work|JIRAs|Date|Status|Deployment|Version|Branch|Linked|Resolved|Created|Last updated|Formal announced|Confirmed release|Planned):/.test(
              block.text,
            );
          draw(block.text, { color: metadata || !isJira ? MUTED : INK, size: metadata || !isJira ? 9.5 : 10.5 });
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

function createPage(pages: PdfPage[]): PdfPage {
  const page = { commands: [], y: 48 };
  pages.push(page);
  return page;
}

function wrapText(value: string, maximumCharacters: number): string[] {
  const lines: string[] = [];
  for (const paragraph of value.replace(/\r/g, '').split('\n')) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (!words.length) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const word of words) {
      const pieces: string[] = [];
      for (let index = 0; index < word.length; index += maximumCharacters) {
        pieces.push(word.slice(index, index + maximumCharacters));
      }
      for (const piece of pieces) {
        const next = line ? `${line} ${piece}` : piece;
        if (next.length <= maximumCharacters) line = next;
        else {
          if (line) lines.push(line);
          line = piece;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function pdfText(value: string): string {
  return value
    .replace(/[\u2010-\u2015]/g, '-')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/\u2026/g, '...')
    .replace(/\u00b7/g, '|')
    .replace(/\u2022/g, '-')
    .replace(/\u2192/g, '->')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7e]/g, '?')
    .replace(/([\\()])/g, '\\$1');
}

function pdfBlob(pages: PdfPage[]): Blob {
  const fontRegular = 3 + pages.length * 2;
  const fontBold = fontRegular + 1;
  const objects: string[] = [];
  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] =
    `<< /Type /Pages /Count ${pages.length} /Kids [` +
    pages.map((_, index) => `${3 + index * 2} 0 R`).join(' ') +
    '] >>';
  pages.forEach((page, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const stream = page.commands.join('\n');
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
      `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R /F3 ${fontBold + 1} 0 R /F4 ${fontBold + 2} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontRegular] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[fontBold] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';
  objects[fontBold + 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
  objects[fontBold + 2] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique /Encoding /WinAnsiEncoding >>';

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
