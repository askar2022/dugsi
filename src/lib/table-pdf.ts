export type PdfColumn = {
  key: string;
  label: string;
  x: number;
};

function pdfEscape(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function textLine(x: number, y: number, size: number, value: string) {
  return `BT /F1 ${size} Tf ${x} ${y} Td (${pdfEscape(value.slice(0, 48))}) Tj ET`;
}

function chunk<T>(items: T[], size: number) {
  const pages: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    pages.push(items.slice(index, index + size));
  }
  return pages;
}

export function downloadTablePdf(input: {
  title: string;
  subtitle: string;
  filename: string;
  columns: PdfColumn[];
  rows: Array<Record<string, string>>;
  footer?: string;
}) {
  const pageWidth = 612;
  const pageHeight = 792;
  const left = 36;
  const lineHeight = 16;
  const firstRowY = 680;
  const rowsPerPage = 36;
  const pages = input.rows.length === 0 ? [[] as Array<Record<string, string>>] : chunk(input.rows, rowsPerPage);
  const fontId = 3 + pages.length * 2;
  const objects: string[] = [];

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push(`<< /Type /Pages /Kids [${pages.map((_, index) => `${3 + index} 0 R`).join(" ")}] /Count ${pages.length} >>`);

  pages.forEach((_, index) => {
    const contentId = 3 + pages.length + index;
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R >> >> >>`,
    );
  });

  pages.forEach((rows, index) => {
    const commands = [
      textLine(left, 750, 16, input.title),
      textLine(left, 728, 11, input.subtitle),
      ...input.columns.map((column) => textLine(column.x, 710, 10, column.label)),
    ];
    rows.forEach((row, rowIndex) => {
      const y = firstRowY - rowIndex * lineHeight;
      input.columns.forEach((column) => {
        commands.push(textLine(column.x, y, 10, row[column.key] ?? ""));
      });
    });
    if (index === pages.length - 1 && input.footer) {
      commands.push(textLine(left, 56, 10, input.footer));
    }
    commands.push(textLine(left, 36, 9, `Page ${index + 1} of ${pages.length}`));
    const stream = commands.join("\n");
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  let offset = 0;
  const chunks = ["%PDF-1.4\n"];
  offset = chunks[0].length;
  const xref = [0];
  objects.forEach((body, index) => {
    const object = `${index + 1} 0 obj\n${body}\nendobj\n`;
    xref.push(offset);
    chunks.push(object);
    offset += object.length;
  });
  chunks.push(
    [
      "xref",
      `0 ${objects.length + 1}`,
      "0000000000 65535 f ",
      ...xref.slice(1).map((value) => `${String(value).padStart(10, "0")} 00000 n `),
      "",
      "trailer",
      `<< /Size ${objects.length + 1} /Root 1 0 R >>`,
      "startxref",
      String(offset),
      "%%EOF",
    ].join("\n"),
  );

  const blob = new Blob(chunks, { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = input.filename;
  link.click();
  URL.revokeObjectURL(url);
}
