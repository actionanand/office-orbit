import type { WorkLogReport } from '../../features/work-logs/work-log-report';

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
  draw('Work Log Report', { size: 13 });
  gap(8);
  draw('Period: ' + report.period);
  draw('Categories: ' + report.categories);
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
      `/Resources << /Font << /F1 ${fontRegular} 0 R /F2 ${fontBold} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontRegular] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[fontBold] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

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
