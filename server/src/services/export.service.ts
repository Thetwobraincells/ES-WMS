import PDFDocument from "pdfkit";
import { parse } from "json2csv";

export function generateCsvBuffer(data: any[]): Buffer {
  if (data.length === 0) {
    return Buffer.from("", "utf-8");
  }

  const csv = parse(data);
  return Buffer.from(csv, "utf-8");
}

export function generatePdfBuffer(
  title: string,
  headers: string[],
  rows: any[][]
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({
      margin: 40,
      size: "A4",
    });
    const chunks: Buffer[] = [];

    document.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    document.on("end", () => {
      resolve(Buffer.concat(chunks));
    });

    document.on("error", reject);

    document.fontSize(18).text(title, { underline: true });
    document.moveDown();

    if (headers.length > 0) {
      const headerLine = headers.join(" | ");
      document.fontSize(12).text(headerLine);
      document.moveDown(0.5);
      document.text("-".repeat(Math.max(headerLine.length, 40)));
      document.moveDown(0.5);
    }

    rows.forEach((row) => {
      if (document.y > document.page.height - 60) {
        document.addPage();
      }

      document.fontSize(11).text(row.map((value) => String(value ?? "")).join(" | "));
      document.moveDown(0.4);
    });

    document.end();
  });
}
