import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const appPackage = readFileSync('capacitor.config.ts', 'utf8').match(/appId:\s*'([^']+)'/)?.[1];
if (!appPackage) throw new Error('Missing appId');
const javaDir = join('android', 'app', 'src', 'main', 'java', ...appPackage.split('.'));
const mainActivityPath = join(javaDir, 'MainActivity.java');
const exportPluginPath = join(javaDir, 'OfficeOrbitExportPlugin.java');
const manifestPath = join('android', 'app', 'src', 'main', 'AndroidManifest.xml');
const filePathsPath = join('android', 'app', 'src', 'main', 'res', 'xml', 'office_orbit_file_paths.xml');

mkdirSync(javaDir, { recursive: true });
mkdirSync(dirname(filePathsPath), { recursive: true });

writeFileSync(
  exportPluginPath,
  `package ${appPackage};

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.pdf.PdfDocument;
import android.net.Uri;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;

import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "OfficeOrbitExport")
public class OfficeOrbitExportPlugin extends Plugin {
  private static final int PAGE_WIDTH = 595;
  private static final int PAGE_HEIGHT = 842;
  private static final int PAGE_MARGIN = 36;
  private static final int AVAILABLE_WIDTH = PAGE_WIDTH - (PAGE_MARGIN * 2);
  private static final int TABLE_PADDING = 5;
  private static final int TABLE_LINE_HEIGHT = 11;
  private static final int TABLE_MIN_ROW_HEIGHT = 24;

  @PluginMethod
  public void exportPdf(PluginCall call) {
    String filename = call.getString("filename");
    String content = call.getString("content");
    String title = call.getString("title", "Office Orbit PDF Export");

    if (filename == null || filename.trim().isEmpty()) {
      call.reject("A filename is required.");
      return;
    }
    if (content == null || content.trim().isEmpty()) {
      call.reject("PDF content is required.");
      return;
    }

    try {
      File exportDir = new File(getContext().getCacheDir(), "exports");
      if (!exportDir.exists() && !exportDir.mkdirs()) {
        call.reject("Unable to prepare export folder.");
        return;
      }

      String outputName = sanitizeFileName(filename);
      if (!outputName.toLowerCase().endsWith(".pdf")) {
        outputName = outputName + ".pdf";
      }

      File outputFile = new File(exportDir, outputName);
      writePdf(outputFile, title, content);
      shareFile(outputFile, "application/pdf", title);

      JSObject result = new JSObject();
      result.put("path", outputFile.getAbsolutePath());
      call.resolve(result);
    } catch (ActivityNotFoundException ex) {
      call.reject("No app can save or share this PDF.");
    } catch (Exception ex) {
      call.reject("Unable to export PDF.");
    }
  }

  private void writePdf(File outputFile, String fallbackTitle, String content) throws Exception {
    JSONObject report = new JSONObject(content);
    PdfDocument document = new PdfDocument();

    Paint titlePaint = makePaint(Color.rgb(31, 41, 55), 18, true);
    Paint subtitlePaint = makePaint(Color.rgb(107, 114, 128), 10, false);
    Paint sectionPaint = makePaint(Color.rgb(31, 41, 55), 13, true);
    Paint summaryPaint = makePaint(Color.rgb(55, 65, 81), 10, false);
    Paint summaryValuePaint = makePaint(Color.rgb(23, 99, 63), 13, true);
    Paint headerPaint = makePaint(Color.rgb(31, 41, 55), 8.5f, true);
    Paint cellPaint = makePaint(Color.rgb(31, 41, 55), 8.2f, false);
    Paint mutedCellPaint = makePaint(Color.rgb(97, 97, 97), 8.2f, false);

    Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    borderPaint.setColor(Color.rgb(203, 213, 225));
    borderPaint.setStyle(Paint.Style.STROKE);
    borderPaint.setStrokeWidth(1);

    Paint headerBackgroundPaint = fillPaint(Color.rgb(232, 244, 251));
    Paint alternateBackgroundPaint = fillPaint(Color.rgb(248, 250, 252));
    Paint weekOffBackgroundPaint = fillPaint(Color.rgb(255, 247, 237));
    Paint noEntryBackgroundPaint = fillPaint(Color.rgb(254, 242, 242));

    PageState state = startPage(document, 1);
    String title = report.optString("title", fallbackTitle);
    state.canvas.drawText(title, PAGE_MARGIN, state.y, titlePaint);
    state.y += 18;

    String generatedOn = report.optString("generatedOn", "");
    if (!generatedOn.isEmpty()) {
      state.canvas.drawText("Generated on " + generatedOn, PAGE_MARGIN, state.y, subtitlePaint);
      state.y += 18;
    } else {
      state.y += 8;
    }

    drawSummary(document, state, report.optJSONArray("summary"), summaryPaint, summaryValuePaint);
    state.y += 8;

    JSONArray headers = report.optJSONArray("headers");
    JSONArray sections = report.optJSONArray("sections");
    if (headers == null || headers.length() == 0 || sections == null || sections.length() == 0) {
      state.canvas.drawText("No entries found for this export.", PAGE_MARGIN, state.y, summaryPaint);
    } else {
      float[] widths = calculateWidths(headers);
      for (int index = 0; index < sections.length(); index++) {
        JSONObject section = sections.optJSONObject(index);
        if (section == null) continue;

        if (index > 0) {
          state.y += 10;
        }
        drawSectionHeader(document, state, section, sectionPaint, subtitlePaint);
        drawTable(
          document,
          state,
          headers,
          section.optJSONArray("rows"),
          widths,
          headerPaint,
          cellPaint,
          mutedCellPaint,
          borderPaint,
          headerBackgroundPaint,
          alternateBackgroundPaint,
          weekOffBackgroundPaint,
          noEntryBackgroundPaint
        );
      }
    }

    ensureSpace(document, state, 28);
    state.y += 12;
    state.canvas.drawText("Office Orbit - Work Log Report", PAGE_MARGIN, state.y, subtitlePaint);

    drawFooter(state);
    document.finishPage(state.page);
    try (FileOutputStream output = new FileOutputStream(outputFile, false)) {
      document.writeTo(output);
    } finally {
      document.close();
    }
  }

  private Paint makePaint(int color, float textSize, boolean bold) {
    Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    paint.setColor(color);
    paint.setTextSize(textSize);
    if (bold) {
      paint.setTypeface(Typeface.create(Typeface.DEFAULT, Typeface.BOLD));
    }
    return paint;
  }

  private Paint fillPaint(int color) {
    Paint paint = new Paint(Paint.ANTI_ALIAS_FLAG);
    paint.setColor(color);
    paint.setStyle(Paint.Style.FILL);
    return paint;
  }

  private PageState startPage(PdfDocument document, int pageNumber) {
    PdfDocument.PageInfo pageInfo = new PdfDocument.PageInfo.Builder(
      PAGE_WIDTH,
      PAGE_HEIGHT,
      pageNumber
    ).create();
    PageState state = new PageState();
    state.page = document.startPage(pageInfo);
    state.canvas = state.page.getCanvas();
    state.canvas.drawColor(Color.WHITE);
    state.pageNumber = pageNumber;
    state.y = PAGE_MARGIN;
    return state;
  }

  private void startNextPage(PdfDocument document, PageState state) {
    drawFooter(state);
    document.finishPage(state.page);
    PageState next = startPage(document, state.pageNumber + 1);
    state.page = next.page;
    state.canvas = next.canvas;
    state.pageNumber = next.pageNumber;
    state.y = next.y;
  }

  private void ensureSpace(PdfDocument document, PageState state, int height) {
    if (state.y + height > PAGE_HEIGHT - PAGE_MARGIN) {
      startNextPage(document, state);
    }
  }
  private void drawFooter(PageState state) {
    state.canvas.drawText("Office Orbit  |  Page " + state.pageNumber, PAGE_MARGIN, PAGE_HEIGHT - 18, makePaint(Color.DKGRAY, 8, false));
  }

  private void drawSummary(
    PdfDocument document,
    PageState state,
    JSONArray summary,
    Paint labelPaint,
    Paint valuePaint
  ) {
    if (summary == null || summary.length() == 0) {
      return;
    }

    ensureSpace(document, state, 54);
    int columns = Math.min(4, Math.max(1, summary.length()));
    float itemWidth = (float) AVAILABLE_WIDTH / columns;
    int startY = state.y;

    for (int index = 0; index < summary.length(); index++) {
      JSONObject item = summary.optJSONObject(index);
      if (item == null) continue;

      int row = index / columns;
      int col = index % columns;
      float x = PAGE_MARGIN + (itemWidth * col);
      int y = startY + (row * 32);

      state.canvas.drawText(item.optString("value", "-"), x, y, valuePaint);
      state.canvas.drawText(item.optString("label", ""), x, y + 13, labelPaint);
    }

    state.y = startY + (((summary.length() - 1) / columns) + 1) * 32;
  }

  private void drawSectionHeader(
    PdfDocument document,
    PageState state,
    JSONObject section,
    Paint sectionPaint,
    Paint statPaint
  ) {
    ensureSpace(document, state, 34);
    state.canvas.drawText(section.optString("title", "Entries"), PAGE_MARGIN, state.y, sectionPaint);
    state.y += 16;

    JSONArray stats = section.optJSONArray("stats");
    if (stats == null || stats.length() == 0) {
      return;
    }

    StringBuilder line = new StringBuilder();
    for (int index = 0; index < stats.length(); index++) {
      JSONObject stat = stats.optJSONObject(index);
      if (stat == null) continue;
      if (line.length() > 0) {
        line.append("   ");
      }
      line.append(stat.optString("label", ""));
      line.append(": ");
      line.append(stat.optString("value", ""));
    }

    state.canvas.drawText(line.toString(), PAGE_MARGIN, state.y, statPaint);
    state.y += 14;
  }

  private void drawTable(
    PdfDocument document,
    PageState state,
    JSONArray headers,
    JSONArray rows,
    float[] widths,
    Paint headerPaint,
    Paint cellPaint,
    Paint mutedCellPaint,
    Paint borderPaint,
    Paint headerBackgroundPaint,
    Paint alternateBackgroundPaint,
    Paint weekOffBackgroundPaint,
    Paint noEntryBackgroundPaint
  ) {
    drawHeaderRow(document, state, headers, widths, headerPaint, borderPaint, headerBackgroundPaint);

    if (rows == null || rows.length() == 0) {
      ensureSpace(document, state, 24);
      state.canvas.drawText("No entries found.", PAGE_MARGIN, state.y + 14, mutedCellPaint);
      state.y += 24;
      return;
    }

    for (int rowIndex = 0; rowIndex < rows.length(); rowIndex++) {
      JSONObject row = rows.optJSONObject(rowIndex);
      if (row == null) continue;

      JSONArray cells = row.optJSONArray("cells");
      if (cells == null) continue;

      int rowHeight = measureRowHeight(cells, widths, cellPaint);
      if (cells.length() == 1 && rowHeight > 650) {
        List<String> lines = wrapText(cells.optString(0, ""), cellPaint, widths[0] - TABLE_PADDING * 2);
        for (int offset = 0; offset < lines.size(); offset += 45) {
          JSONArray chunk = new JSONArray();
          chunk.put(android.text.TextUtils.join("\\n", lines.subList(offset, Math.min(offset + 45, lines.size()))));
          int chunkHeight = measureRowHeight(chunk, widths, cellPaint);
          if (state.y + chunkHeight > PAGE_HEIGHT - PAGE_MARGIN) {
            startNextPage(document, state);
            drawHeaderRow(document, state, headers, widths, headerPaint, borderPaint, headerBackgroundPaint);
          }
          drawRow(state, chunk, widths, cellPaint, borderPaint, null);
        }
        continue;
      }
      if (state.y + rowHeight > PAGE_HEIGHT - PAGE_MARGIN) {
        startNextPage(document, state);
        drawHeaderRow(document, state, headers, widths, headerPaint, borderPaint, headerBackgroundPaint);
      }

      String rowState = row.optString("state", "normal");
      Paint background = null;
      Paint textPaint = cellPaint;

      if ("week-off".equals(rowState)) {
        background = weekOffBackgroundPaint;
        textPaint = mutedCellPaint;
      } else if ("no-entry".equals(rowState)) {
        background = noEntryBackgroundPaint;
        textPaint = mutedCellPaint;
      } else if (rowIndex % 2 == 1) {
        background = alternateBackgroundPaint;
      }

      drawRow(state, cells, widths, textPaint, borderPaint, background);
    }
  }

  private void drawHeaderRow(
    PdfDocument document,
    PageState state,
    JSONArray headers,
    float[] widths,
    Paint headerPaint,
    Paint borderPaint,
    Paint headerBackgroundPaint
  ) {
    int headerHeight = measureRowHeight(headers, widths, headerPaint);
    ensureSpace(document, state, headerHeight + TABLE_MIN_ROW_HEIGHT);
    drawRow(state, headers, widths, headerPaint, borderPaint, headerBackgroundPaint);
  }

  private int measureRowHeight(JSONArray cells, float[] widths, Paint paint) {
    int maxLines = 1;
    for (int index = 0; index < widths.length; index++) {
      String text = cells.optString(index, "");
      List<String> lines = wrapText(text, paint, widths[index] - (TABLE_PADDING * 2));
      maxLines = Math.max(maxLines, lines.size());
    }
    return Math.max(TABLE_MIN_ROW_HEIGHT, (maxLines * TABLE_LINE_HEIGHT) + (TABLE_PADDING * 2));
  }

  private void drawRow(
    PageState state,
    JSONArray cells,
    float[] widths,
    Paint textPaint,
    Paint borderPaint,
    Paint backgroundPaint
  ) {
    int rowHeight = measureRowHeight(cells, widths, textPaint);
    float x = PAGE_MARGIN;
    int top = state.y;

    for (int index = 0; index < widths.length; index++) {
      float right = x + widths[index];
      if (backgroundPaint != null) {
        state.canvas.drawRect(x, top, right, top + rowHeight, backgroundPaint);
      }
      state.canvas.drawRect(x, top, right, top + rowHeight, borderPaint);

      List<String> lines = wrapText(cells.optString(index, ""), textPaint, widths[index] - (TABLE_PADDING * 2));
      float baseline = top + TABLE_PADDING - textPaint.ascent();
      for (String line : lines) {
        state.canvas.drawText(line, x + TABLE_PADDING, baseline, textPaint);
        baseline += TABLE_LINE_HEIGHT;
      }
      x = right;
    }

    state.y += rowHeight;
  }

  private float[] calculateWidths(JSONArray headers) {
    float[] weights = new float[headers.length()];
    float totalWeight = 0;

    for (int index = 0; index < headers.length(); index++) {
      String header = headers.optString(index, "");
      float weight = headerWeight(header);
      weights[index] = weight;
      totalWeight += weight;
    }

    float[] widths = new float[headers.length()];
    for (int index = 0; index < headers.length(); index++) {
      widths[index] = AVAILABLE_WIDTH * (weights[index] / totalWeight);
    }
    return widths;
  }

  private float headerWeight(String header) {
    String value = header == null ? "" : header.toLowerCase();
    if ("date".equals(value)) return 1.15f;
    if ("day".equals(value)) return 0.85f;
    if ("entry time".equals(value)) return 1.35f;
    if ("exit time".equals(value)) return 1.35f;
    if ("duration".equals(value)) return 1.0f;
    if ("company".equals(value)) return 1.45f;
    if ("status".equals(value)) return 1.15f;
    if ("comments".equals(value)) return 2.1f;
    return 1.0f;
  }

  private List<String> wrapText(String text, Paint paint, float maxWidth) {
    List<String> lines = new ArrayList<>();
    String safeText = text == null ? "" : text.trim();
    if (safeText.contains("\\n")) {
      for (String paragraph : safeText.split("\\n", -1)) lines.addAll(wrapText(paragraph, paint, maxWidth));
      return lines;
    }
    if (safeText.isEmpty()) {
      lines.add("");
      return lines;
    }

    StringBuilder current = new StringBuilder();
    for (String word : safeText.split("\\\\s+")) {
      String next = current.length() == 0 ? word : current + " " + word;
      if (paint.measureText(next) <= maxWidth) {
        current.setLength(0);
        current.append(next);
        continue;
      }

      if (current.length() > 0) {
        lines.add(current.toString());
        current.setLength(0);
      }

      if (paint.measureText(word) <= maxWidth) {
        current.append(word);
      } else {
        lines.addAll(breakLongWord(word, paint, maxWidth));
      }
    }

    if (current.length() > 0) {
      lines.add(current.toString());
    }
    return lines;
  }

  private List<String> breakLongWord(String word, Paint paint, float maxWidth) {
    List<String> parts = new ArrayList<>();
    StringBuilder current = new StringBuilder();
    for (int index = 0; index < word.length(); index++) {
      String next = current.toString() + word.charAt(index);
      if (paint.measureText(next) > maxWidth && current.length() > 0) {
        parts.add(current.toString());
        current.setLength(0);
      }
      current.append(word.charAt(index));
    }
    if (current.length() > 0) {
      parts.add(current.toString());
    }
    return parts;
  }

  private static class PageState {
    PdfDocument.Page page;
    Canvas canvas;
    int pageNumber;
    int y;
  }

  private void shareFile(File file, String mimeType, String title) {
    Uri uri = FileProvider.getUriForFile(
      getContext(),
      getContext().getPackageName() + ".exportprovider",
      file
    );

    Intent shareIntent = new Intent(Intent.ACTION_SEND);
    shareIntent.setType(mimeType);
    shareIntent.putExtra(Intent.EXTRA_STREAM, uri);
    shareIntent.putExtra(Intent.EXTRA_TITLE, title);
    shareIntent.putExtra(Intent.EXTRA_SUBJECT, title);
    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

    getActivity().startActivity(Intent.createChooser(shareIntent, title));
  }

  private String sanitizeFileName(String filename) {
    String cleaned = filename.trim().replaceAll("[^a-zA-Z0-9._-]", "_");
    return cleaned.isEmpty() ? "office-orbit-export.pdf" : cleaned;
  }
}
`,
);

writeFileSync(
  filePathsPath,
  `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="exports" path="exports/" />
</paths>
`,
);

let mainActivity = readFileSync(mainActivityPath, 'utf8');
if (!/registerPlugin\(OfficeOrbitExportPlugin\.class\)/.test(mainActivity)) {
  if (/super\.onCreate\(savedInstanceState\);/.test(mainActivity)) {
    mainActivity = mainActivity.replace(
      /super\.onCreate\(savedInstanceState\);/,
      'registerPlugin(OfficeOrbitExportPlugin.class);\n    super.onCreate(savedInstanceState);',
    );
  } else {
    mainActivity = `package ${appPackage};

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(OfficeOrbitExportPlugin.class);
    super.onCreate(savedInstanceState);
  }
}
`;
  }
  writeFileSync(mainActivityPath, mainActivity);
}

let manifest = readFileSync(manifestPath, 'utf8');
if (!/android:name="androidx\.core\.content\.FileProvider"/.test(manifest)) {
  manifest = manifest.replace(
    /<\/application>/,
    `        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.exportprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/office_orbit_file_paths" />
        </provider>
    </application>`,
  );
}

writeFileSync(manifestPath, manifest);

console.log('Android PDF export plugin patched for Office Orbit.');
