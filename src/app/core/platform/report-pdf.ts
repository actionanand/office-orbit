import { WorkLogReport } from '../../features/work-logs/work-log-report';

/** Browser-native page layout with JPEG PDF pages. Unicode uses the browser font renderer. */
export async function reportPdf(report: WorkLogReport): Promise<Blob> {
  await document.fonts.ready;
  const pages: Uint8Array[] = [];
  const canvas = document.createElement('canvas');
  canvas.width = 1190;
  canvas.height = 1684;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('PDF rendering is unavailable.');
  let y = 0;
  const begin = () => {
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = '#17633f';
    context.font = 'bold 34px sans-serif';
    context.fillText('Office Orbit', 72, 80);
    context.fillStyle = '#182b21';
    context.font = '24px sans-serif';
    context.fillText('Work Log Report', 72, 120);
    y = 165;
  };
  const finish = () => {
    context.fillStyle = '#46584d';
    context.font = '18px sans-serif';
    context.fillText('Page ' + (pages.length + 1), 72, 1630);
    const binary = atob(canvas.toDataURL('image/jpeg', 0.94).split(',')[1]);
    pages.push(Uint8Array.from(binary, character => character.charCodeAt(0)));
  };
  const wrap = (text: string): string[] => {
    const lines: string[] = [];
    for (const paragraph of text.split('\n')) {
      let line = '';
      for (const character of paragraph) {
        if (context.measureText(line + character).width > 1046) {
          lines.push(line);
          line = '';
        }
        line += character;
      }
      lines.push(line);
    }
    return lines;
  };
  const draw = (text: string, bold = false) => {
    context.font = (bold ? 'bold ' : '') + '22px sans-serif';
    for (const line of wrap(text)) {
      if (y > 1560) {
        finish();
        begin();
        context.font = (bold ? 'bold ' : '') + '22px sans-serif';
      }
      context.fillStyle = '#182b21';
      context.fillText(line, 72, y);
      y += 31;
    }
  };
  begin();
  draw('Period: ' + report.period);
  draw('Categories: ' + report.categories);
  draw('Generated: ' + report.generated);
  y += 25;
  for (const record of report.records) {
    context.font = '22px sans-serif';
    const height = [record.date, record.title, ...record.lines].reduce((sum, line) => sum + wrap(line).length * 31, 30);
    if (height < 1350 && y + height > 1560) {
      finish();
      begin();
    }
    draw(record.date, true);
    draw(record.title, true);
    for (const line of record.lines) draw(line);
    y += 25;
    await Promise.resolve();
  }
  finish();
  canvas.width = 0;
  canvas.height = 0;
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const offsets = [0];
  let length = 0;
  const append = (part: string | Uint8Array) => {
    const bytes = typeof part === 'string' ? encoder.encode(part) : part;
    parts.push(bytes);
    length += bytes.length;
  };
  const object = (id: number, body: string | Uint8Array, prefix = '') => {
    offsets[id] = length;
    append(id + ' 0 obj\n');
    append(prefix);
    append(body);
    append('\nendobj\n');
  };
  append('%PDF-1.4\n');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(
    2,
    '<< /Type /Pages /Count ' +
      pages.length +
      ' /Kids [' +
      pages.map((_, index) => 3 + index * 3 + ' 0 R').join(' ') +
      '] >>',
  );
  pages.forEach((jpeg, index) => {
    const id = 3 + index * 3;
    object(
      id,
      '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /XObject << /Im0 ' +
        (id + 1) +
        ' 0 R >> >> /Contents ' +
        (id + 2) +
        ' 0 R >>',
    );
    offsets[id + 1] = length;
    append(
      id +
        1 +
        ' 0 obj\n<< /Type /XObject /Subtype /Image /Width 1190 /Height 1684 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' +
        jpeg.length +
        ' >>\nstream\n',
    );
    append(jpeg);
    append('\nendstream\nendobj\n');
    const stream = 'q 595 0 0 842 0 0 cm /Im0 Do Q';
    object(id + 2, '<< /Length ' + stream.length + ' >>\nstream\n' + stream + '\nendstream');
  });
  const xref = length;
  append('xref\n0 ' + offsets.length + '\n0000000000 65535 f \n');
  for (const offset of offsets.slice(1)) append(String(offset).padStart(10, '0') + ' 00000 n \n');
  append('trailer\n<< /Size ' + offsets.length + ' /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF');
  return new Blob(
    parts.map(part => part.slice().buffer),
    { type: 'application/pdf' },
  );
}
