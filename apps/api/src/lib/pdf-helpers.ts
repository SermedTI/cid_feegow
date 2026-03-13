import PDFDocument from "pdfkit";

// ── Brand colors ──
export const COLORS = {
  primary: "#1e3a5f",
  primaryLight: "#2d5a8e",
  accent: "#3b82f6",
  headerBg: "#1e3a5f",
  headerText: "#ffffff",
  sectionTitle: "#1e3a5f",
  bodyText: "#374151",
  mutedText: "#6b7280",
  border: "#d1d5db",
  rowEven: "#f9fafb",
  rowOdd: "#ffffff",
  metricBg: "#eff6ff",
  metricBorder: "#bfdbfe",
  success: "#059669",
  white: "#ffffff",
} as const;

const PAGE_HEIGHT = 841.89; // A4
const PAGE_WIDTH = 595.28;  // A4
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const USABLE_BOTTOM = PAGE_HEIGHT - MARGIN - 24; // leave room for footer

export function fmtNum(value: number): string {
  return new Intl.NumberFormat("pt-BR").format(value);
}

export function fmtDate(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(d);
}

export function fmtNow(): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeStyle: "short" }).format(new Date());
}

// ── Header banner ──
export function drawHeader(doc: InstanceType<typeof PDFDocument>, title: string, subtitle: string) {
  const bannerHeight = 72;
  doc
    .save()
    .rect(0, 0, PAGE_WIDTH, bannerHeight)
    .fill(COLORS.headerBg);

  doc
    .font("Helvetica-Bold")
    .fontSize(18)
    .fillColor(COLORS.headerText)
    .text(title, MARGIN, 18, { width: CONTENT_WIDTH, lineBreak: false });

  doc
    .font("Helvetica")
    .fontSize(9)
    .fillColor("#94a3b8")
    .text(subtitle, MARGIN, 44, { width: CONTENT_WIDTH, lineBreak: false });

  doc.restore();
  doc.x = MARGIN;
  doc.y = bannerHeight + 20;
  doc.fillColor(COLORS.bodyText);
}

// ── Info bar (date + filters) ──
export function drawInfoBar(doc: InstanceType<typeof PDFDocument>, filterText: string) {
  const y = doc.y;
  doc
    .save()
    .roundedRect(MARGIN, y, CONTENT_WIDTH, 32, 4)
    .fill("#f1f5f9");

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.mutedText)
    .text(`Gerado em ${fmtNow()}`, MARGIN + 10, y + 10, { width: CONTENT_WIDTH / 2 - 20, lineBreak: false })
    .text(filterText, MARGIN + CONTENT_WIDTH / 2, y + 10, {
      width: CONTENT_WIDTH / 2 - 10,
      align: "right",
      lineBreak: false,
    });

  doc.restore();
  doc.x = MARGIN;
  doc.y = y + 44;
  doc.fillColor(COLORS.bodyText);
}

// ── Metric cards row ──
export interface MetricItem {
  label: string;
  value: string;
}

export function drawMetrics(doc: InstanceType<typeof PDFDocument>, items: MetricItem[]) {
  const cols = items.length;
  const gap = 10;
  const cardW = (CONTENT_WIDTH - gap * (cols - 1)) / cols;
  const cardH = 52;
  const startY = doc.y;

  for (let i = 0; i < cols; i++) {
    const x = MARGIN + i * (cardW + gap);

    doc
      .save()
      .roundedRect(x, startY, cardW, cardH, 4)
      .fill(COLORS.metricBg);

    doc
      .roundedRect(x, startY, cardW, cardH, 4)
      .lineWidth(0.5)
      .strokeColor(COLORS.metricBorder)
      .stroke();

    doc
      .font("Helvetica-Bold")
      .fontSize(16)
      .fillColor(COLORS.primary)
      .text(items[i].value, x + 10, startY + 10, { width: cardW - 20, lineBreak: false });

    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor(COLORS.mutedText)
      .text(items[i].label.toUpperCase(), x + 10, startY + 32, { width: cardW - 20, lineBreak: false });

    doc.restore();
  }

  doc.x = MARGIN;
  doc.y = startY + cardH + 16;
  doc.fillColor(COLORS.bodyText);
}

// ── Section title ──
export function drawSectionTitle(doc: InstanceType<typeof PDFDocument>, title: string) {
  // Check if there's room; if not, add page
  if (doc.y + 30 > USABLE_BOTTOM) {
    doc.addPage();
    doc.y = MARGIN;
  }

  const y = doc.y;

  doc
    .save()
    .moveTo(MARGIN, y + 14)
    .lineTo(MARGIN + CONTENT_WIDTH, y + 14)
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .stroke();

  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.sectionTitle)
    .text(title, MARGIN, y, { width: CONTENT_WIDTH, lineBreak: false });

  doc.restore();
  doc.x = MARGIN;
  doc.y = y + 22;
  doc.fillColor(COLORS.bodyText);
}

// ── Table ──
export interface TableColumn {
  label: string;
  width: number; // fraction of content width (0–1)
  align?: "left" | "right" | "center";
}

const TABLE_FONT_SIZE = 8;
const TABLE_HEADER_FONT_SIZE = 7.5;
const TABLE_HEADER_HEIGHT = 22;
const TABLE_CELL_PAD_X = 6;
const TABLE_CELL_PAD_Y = 5;
const TABLE_MIN_ROW_HEIGHT = 22;
const TABLE_MAX_ROW_HEIGHT = 42; // max ~3 lines

/**
 * Truncates text to fit within maxWidth at the given fontSize, appending "..." if needed.
 */
function truncateText(
  doc: InstanceType<typeof PDFDocument>,
  text: string,
  maxWidth: number,
  maxHeight: number,
  fontSize: number,
): string {
  doc.font("Helvetica").fontSize(fontSize);
  const h = doc.heightOfString(text, { width: maxWidth });
  if (h <= maxHeight) return text;

  // Binary search for the longest substring that fits
  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    const candidate = text.slice(0, mid) + "...";
    const ch = doc.heightOfString(candidate, { width: maxWidth });
    if (ch <= maxHeight) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return lo > 0 ? text.slice(0, lo) + "..." : "...";
}

/**
 * Measures the required height for a row, clamped between min and max.
 */
function measureRowHeight(
  doc: InstanceType<typeof PDFDocument>,
  row: string[],
  colWidths: number[],
): number {
  doc.font("Helvetica").fontSize(TABLE_FONT_SIZE);
  let maxH = 0;
  for (let i = 0; i < row.length; i++) {
    const cellW = colWidths[i] - TABLE_CELL_PAD_X * 2;
    if (cellW <= 0) continue;
    const h = doc.heightOfString(row[i] ?? "", { width: cellW });
    if (h > maxH) maxH = h;
  }
  const rowH = maxH + TABLE_CELL_PAD_Y * 2;
  return Math.max(TABLE_MIN_ROW_HEIGHT, Math.min(rowH, TABLE_MAX_ROW_HEIGHT));
}

export function drawTable(
  doc: InstanceType<typeof PDFDocument>,
  columns: TableColumn[],
  rows: string[][],
) {
  const colWidths = columns.map((c) => c.width * CONTENT_WIDTH);

  function drawHeaderRow(y: number) {
    doc
      .save()
      .rect(MARGIN, y, CONTENT_WIDTH, TABLE_HEADER_HEIGHT)
      .fill(COLORS.primaryLight);

    let x = MARGIN;
    for (let i = 0; i < columns.length; i++) {
      doc
        .font("Helvetica-Bold")
        .fontSize(TABLE_HEADER_FONT_SIZE)
        .fillColor(COLORS.white)
        .text(columns[i].label.toUpperCase(), x + TABLE_CELL_PAD_X, y + 6, {
          width: colWidths[i] - TABLE_CELL_PAD_X * 2,
          align: columns[i].align ?? "left",
          lineBreak: false,
        });
      // Reset cursor so PDFKit doesn't auto-add pages
      doc.x = MARGIN;
      doc.y = y;
      x += colWidths[i];
    }
    doc.restore();
    doc.x = MARGIN;
    doc.y = y + TABLE_HEADER_HEIGHT;
    return y + TABLE_HEADER_HEIGHT;
  }

  function drawDataRow(y: number, row: string[], rowHeight: number, even: boolean) {
    const bg = even ? COLORS.rowEven : COLORS.rowOdd;

    doc.save().rect(MARGIN, y, CONTENT_WIDTH, rowHeight).fill(bg);

    // Thin separator line at bottom of row
    doc
      .moveTo(MARGIN, y + rowHeight)
      .lineTo(MARGIN + CONTENT_WIDTH, y + rowHeight)
      .lineWidth(0.25)
      .strokeColor(COLORS.border)
      .stroke();

    let x = MARGIN;
    for (let i = 0; i < columns.length; i++) {
      const cellW = colWidths[i] - TABLE_CELL_PAD_X * 2;
      const cellMaxH = rowHeight - TABLE_CELL_PAD_Y * 2;
      const cellText = truncateText(doc, row[i] ?? "", cellW, cellMaxH, TABLE_FONT_SIZE);

      doc
        .font("Helvetica")
        .fontSize(TABLE_FONT_SIZE)
        .fillColor(COLORS.bodyText)
        .text(cellText, x + TABLE_CELL_PAD_X, y + TABLE_CELL_PAD_Y, {
          width: cellW,
          height: cellMaxH,
          align: columns[i].align ?? "left",
          ellipsis: true,
        });

      // CRITICAL: reset cursor after each cell to prevent PDFKit from
      // auto-adding blank pages when the internal y exceeds page height
      doc.x = MARGIN;
      doc.y = y;

      x += colWidths[i];
    }
    doc.restore();
    doc.x = MARGIN;
    doc.y = y + rowHeight;
    return y + rowHeight;
  }

  // Pre-process: measure row heights and truncate text
  const rowHeights = rows.map((row) => measureRowHeight(doc, row, colWidths));

  // Draw header
  let y = drawHeaderRow(doc.y);

  for (let r = 0; r < rows.length; r++) {
    const rh = rowHeights[r];

    // Page break check — need room for row + header on new page
    if (y + rh > USABLE_BOTTOM) {
      doc.addPage();
      doc.x = MARGIN;
      doc.y = MARGIN;
      y = MARGIN;
      y = drawHeaderRow(y);
    }

    y = drawDataRow(y, rows[r], rh, r % 2 === 0);

    // Keep cursor in sync after each row
    doc.x = MARGIN;
    doc.y = y;
  }

  // Bottom border
  doc
    .save()
    .moveTo(MARGIN, y)
    .lineTo(MARGIN + CONTENT_WIDTH, y)
    .lineWidth(0.5)
    .strokeColor(COLORS.border)
    .stroke()
    .restore();

  doc.x = MARGIN;
  doc.y = y + 12;
  doc.fillColor(COLORS.bodyText);
}

// ── Footer ──
export function drawFooter(doc: InstanceType<typeof PDFDocument>, text: string) {
  const range = doc.bufferedPageRange();
  const pageCount = range.count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);

    // Temporarily inflate page height so PDFKit's continueOnNewPage
    // does NOT trigger when we render text below the normal margin.
    // This is the root cause of blank pages: .text() near the bottom
    // of a buffered page causes PDFKit to auto-add an empty page.
    const realHeight = doc.page.height;
    doc.page.height = 99999;

    const footerY = realHeight - MARGIN + 4;

    // Separator line
    doc
      .save()
      .moveTo(MARGIN, footerY - 4)
      .lineTo(MARGIN + CONTENT_WIDTH, footerY - 4)
      .lineWidth(0.25)
      .strokeColor(COLORS.border)
      .stroke();

    doc
      .font("Helvetica")
      .fontSize(7)
      .fillColor(COLORS.mutedText)
      .text(text, MARGIN, footerY, {
        width: CONTENT_WIDTH / 2,
        lineBreak: false,
      })
      .text(`Pagina ${i + 1} de ${pageCount}`, MARGIN + CONTENT_WIDTH / 2, footerY, {
        width: CONTENT_WIDTH / 2,
        align: "right",
        lineBreak: false,
      })
      .restore();

    // Restore real page height
    doc.page.height = realHeight;
  }
}

export function createDoc() {
  const doc = new PDFDocument({
    margin: MARGIN,
    size: "A4",
    bufferPages: true,
    autoFirstPage: true,
    info: {
      Producer: "CID Feegow Platform",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk) => chunks.push(chunk as Buffer));

  const bufferPromise = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  return { doc, bufferPromise };
}
