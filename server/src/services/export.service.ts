import PDFDocument from "pdfkit";
import { parse } from "json2csv";

export function generateCsvBuffer(data: any[]): Buffer {
  if (data.length === 0) {
    return Buffer.from("", "utf-8");
  }

  const csv = parse(data);
  return Buffer.from(csv, "utf-8");
}

export async function generatePdfBuffer(
  title: string,
  headers: string[],
  rows: any[][]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Document styling constants
    const tableTop = 130;
    const padding = 14;
    const minRowHeight = 45;
    const usableWidth = doc.page.width - 80;
    const colWidth = usableWidth / headers.length;

    // Title & Header
    doc.fontSize(24).font("Helvetica-Bold").fillColor("#111827").text(title, 40, 50, { align: "center" });
    doc.moveTo(40, 95).lineTo(doc.page.width - 40, 95).lineWidth(2).stroke("#2E7D32");

    let currentY = tableTop;

    function drawHeader() {
      doc.rect(40, currentY, usableWidth, minRowHeight).fillAndStroke("#F9FAFB", "#E5E7EB");
      doc.fillColor("#111827").fontSize(11).font("Helvetica-Bold");
      headers.forEach((header, i) => {
        doc.text(header, 40 + i * colWidth + padding, currentY + padding + 2, {
          width: colWidth - padding * 2,
          align: "left",
        });
      });
      currentY += minRowHeight;
    }

    drawHeader();
    doc.font("Helvetica").fontSize(11);
    
    rows.forEach((row, rowIndex) => {
      // 1. Calculate the required height for this row based on content wrapping
      let maxCellHeight = 0;
      row.forEach((cell, i) => {
        const text = String(cell ?? "");
        const height = doc.heightOfString(text, { width: colWidth - padding * 2 });
        if (height > maxCellHeight) maxCellHeight = height;
      });
      const rowHeight = Math.max(minRowHeight, maxCellHeight + padding * 2);

      // 2. Check for page break BEFORE drawing the row
      if (currentY + rowHeight > doc.page.height - 60) {
        // Close the border of the previous page's table portion first
        doc.rect(40, tableTop, usableWidth, currentY - tableTop).lineWidth(1).stroke("#D1D5DB");
        
        doc.addPage();
        currentY = 50;
        drawHeader();
        doc.font("Helvetica").fontSize(11);
      }

      // 3. Draw row background
      const bgColor = rowIndex % 2 === 0 ? "#FFFFFF" : "#F9FAFB";
      doc.rect(40, currentY, usableWidth, rowHeight).fill(bgColor);

      // 4. Draw horizontal dividing line at the bottom of the row
      doc.moveTo(40, currentY + rowHeight).lineTo(40 + usableWidth, currentY + rowHeight).lineWidth(0.5).stroke("#E5E7EB");
      doc.fillColor("#4B5563");

      // 5. Draw text
      row.forEach((cell, i) => {
        const text = String(cell ?? "");
        doc.text(text, 40 + i * colWidth + padding, currentY + padding + 3, {
          width: colWidth - padding * 2,
          align: "left",
        });
      });

      currentY += rowHeight;
    });

    // Draw full boundary box for the table on the final page
    doc.rect(40, tableTop, usableWidth, currentY - tableTop).lineWidth(1).stroke("#D1D5DB");

    doc.end();
  });
}

