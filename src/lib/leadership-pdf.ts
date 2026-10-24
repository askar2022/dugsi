const PAGE_W = 612;
const PAGE_H = 792;
const SCALE = 2;
const GREEN = "#0b3d2e";
const GREEN_DEEP = "#06281e";
const GOLD = "#c4a35a";
const CREAM = "#f7f3eb";
const CREAM_DEEP = "#efe7d6";
const WHITE = "#ffffff";
const MUTED = "#6b7280";
const PAID = "#047857";
const DUE = "#b45309";
const LATE = "#b91c1c";
const DEFAULT_IMAGE = "/ourdugsi-landing.jpg";

export type LeadershipReportInput = {
  schoolName: string;
  adminName?: string | null;
  schoolImageUrl?: string | null;
  generatedAt?: Date;
  enrolled: number;
  waiting: number;
  onTrack: number;
  needPractice: number;
  needSupport: number;
  noRecord: number;
  paid: number;
  due: number;
  late: number;
  expenses: number;
};

function px(pt: number) {
  return pt * SCALE;
}

function money(value: number) {
  return `$${Number(value || 0).toFixed(0)}`;
}

function displayFont() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--font-fraunces").trim();
  return value ? `${value}, Georgia, serif` : "Georgia, serif";
}

function bodyFont() {
  const value = getComputedStyle(document.documentElement).getPropertyValue("--font-outfit").trim();
  return value ? `${value}, system-ui, sans-serif` : "system-ui, sans-serif";
}

function periodLabel(end: Date) {
  const start = new Date(end);
  start.setDate(start.getDate() - 6);
  const year = end.getFullYear();
  const startMonth = start.toLocaleString("en-US", { month: "long" });
  const endMonth = end.toLocaleString("en-US", { month: "long" });
  if (start.getMonth() === end.getMonth()) {
    return `${startMonth} ${start.getDate()}–${end.getDate()}, ${year}`;
  }
  return `${startMonth} ${start.getDate()}–${endMonth} ${end.getDate()}, ${year}`;
}

function generatedLabel(date: Date) {
  return date.toLocaleString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function greetingName(name?: string | null) {
  const trimmed = (name ?? "").trim();
  return trimmed ? `Assalamu Alaikum, ${trimmed}` : "Assalamu Alaikum";
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    if (!src.startsWith("/") && !src.startsWith("data:")) image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = src;
  });
}

async function headerImage(schoolImageUrl?: string | null) {
  if (schoolImageUrl) {
    const uploaded = await loadImage(schoolImageUrl);
    if (uploaded) return uploaded;
  }
  return loadImage(DEFAULT_IMAGE);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

function drawCover(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.clip();
  const scale = Math.max(width / image.width, height / image.height);
  const drawW = image.width * scale;
  const drawH = image.height * scale;
  ctx.drawImage(image, x + (width - drawW) / 2, y + (height - drawH) / 2, drawW, drawH);
  ctx.restore();
  ctx.save();
  roundRect(ctx, x, y, width, height, radius);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = px(1.25);
  ctx.stroke();
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let top = y;
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, top);
      line = word;
      top += lineHeight;
    } else {
      line = next;
    }
  }
  if (line) {
    ctx.fillText(line, x, top);
    top += lineHeight;
  }
  return top;
}

function wrapLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
) {
  if (ctx.measureText(text).width <= maxWidth) {
    ctx.fillText(text, x, y);
    return;
  }
  const words = text.split(" ");
  let line = words[0] ?? "";
  const rest: string[] = [];
  for (const word of words.slice(1)) {
    const next = `${line} ${word}`;
    if (ctx.measureText(next).width <= maxWidth) line = next;
    else rest.push(word);
  }
  ctx.fillText(line, x, y);
  if (rest.length) ctx.fillText(rest.join(" "), x, y + px(10));
}

function drawSection(
  ctx: CanvasRenderingContext2D,
  title: string,
  y: number,
  metrics: Array<{ label: string; value: string; color?: string }>,
) {
  const x = px(36);
  const width = px(540);
  const inner = px(12);
  const boxH = px(68);
  const height = px(44) + boxH;
  ctx.save();
  roundRect(ctx, x, y, width, height, px(12));
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = GOLD;
  ctx.fillRect(x, y, px(6), height);
  ctx.font = `600 ${px(14)}px ${displayFont()}`;
  ctx.fillStyle = GREEN;
  ctx.fillText(title, x + px(20), y + px(28));
  ctx.fillStyle = GOLD;
  ctx.fillRect(x + px(20), y + px(34), px(36), px(2));

  const gap = px(10);
  const boxW = (width - px(32) - gap * (metrics.length - 1)) / metrics.length;
  const boxY = y + px(46);
  metrics.forEach((metric, index) => {
    const boxX = x + px(16) + index * (boxW + gap);
    ctx.save();
    roundRect(ctx, boxX, boxY, boxW, boxH - px(12), px(10));
    ctx.fillStyle = CREAM;
    ctx.fill();
    ctx.restore();
    ctx.font = `600 ${px(8)}px ${bodyFont()}`;
    ctx.fillStyle = MUTED;
    wrapLabel(ctx, metric.label, boxX + inner * 0.65, boxY + px(16), boxW - inner);
    ctx.font = `650 ${px(20)}px ${displayFont()}`;
    ctx.fillStyle = metric.color ?? GREEN;
    ctx.fillText(metric.value, boxX + inner * 0.65, boxY + px(48));
  });
  return y + height + px(14);
}

function attentionLines(input: LeadershipReportInput) {
  const lines: string[] = [];
  if (input.needSupport > 0) {
    lines.push(`${input.needSupport} student${input.needSupport === 1 ? "" : "s"} need additional support`);
  }
  if (input.needPractice > 0) {
    lines.push(`${input.needPractice} student${input.needPractice === 1 ? "" : "s"} need more practice`);
  }
  if (input.late > 0) {
    lines.push(`${money(input.late)} in tuition is late`);
  }
  if (input.waiting > 0) {
    lines.push(`${input.waiting} student${input.waiting === 1 ? "" : "s"} waiting for assessment`);
  }
  return lines.length ? lines : ["No areas need attention this week."];
}

async function paint(input: LeadershipReportInput, image: HTMLImageElement | null) {
  const canvas = document.createElement("canvas");
  canvas.width = PAGE_W * SCALE;
  canvas.height = PAGE_H * SCALE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create the report page.");
  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = CREAM;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = GREEN_DEEP;
  ctx.fillRect(0, 0, canvas.width, px(8));
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, px(8), canvas.width, px(3));

  const now = input.generatedAt ?? new Date();
  const photoW = px(180);
  const photoH = px(100);
  const photoX = px(612 - 36 - 180);
  const photoY = px(28);
  if (image) {
    drawCover(ctx, image, photoX, photoY, photoW, photoH, px(12));
  }

  const left = px(36);
  ctx.font = `650 ${px(20)}px ${displayFont()}`;
  ctx.fillStyle = GREEN;
  wrapText(ctx, input.schoolName || "Your school", left, px(52), px(340), px(24));
  ctx.font = `600 ${px(16)}px ${displayFont()}`;
  ctx.fillStyle = GREEN;
  ctx.fillText("Weekly Leadership Report", left, px(92));
  ctx.font = `500 ${px(11)}px ${bodyFont()}`;
  ctx.fillStyle = GOLD;
  ctx.fillText(periodLabel(now), left, px(112));
  ctx.fillStyle = MUTED;
  ctx.fillText(`Generated ${generatedLabel(now)}`, left, px(128));

  const greetY = px(158);
  ctx.save();
  roundRect(ctx, left, greetY, px(540), px(72), px(12));
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = GOLD;
  ctx.fillRect(left, greetY, px(6), px(72));
  ctx.font = `600 ${px(12)}px ${displayFont()}`;
  ctx.fillStyle = GREEN;
  ctx.fillText(`${greetingName(input.adminName)}.`, left + px(20), greetY + px(28));
  ctx.font = `400 ${px(10.5)}px ${bodyFont()}`;
  ctx.fillStyle = GREEN;
  wrapText(
    ctx,
    "Here is your weekly Dugsi overview. This report highlights enrollment, student progress, finances, and areas needing attention.",
    left + px(20),
    greetY + px(48),
    px(500),
    px(15),
  );

  let cursor = greetY + px(90);
  cursor = drawSection(ctx, "Enrollment", cursor, [
    { label: "Enrolled", value: String(input.enrolled), color: PAID },
    { label: "Waiting for Assessment", value: String(input.waiting), color: DUE },
  ]);
  cursor = drawSection(ctx, "Student Performance", cursor, [
    { label: "On Track", value: String(input.onTrack), color: PAID },
    { label: "Need Practice", value: String(input.needPractice), color: DUE },
    { label: "Need Support", value: String(input.needSupport), color: LATE },
    { label: "No Record", value: String(input.noRecord), color: MUTED },
  ]);
  cursor = drawSection(ctx, "Finance", cursor, [
    { label: "Paid", value: money(input.paid), color: PAID },
    { label: "Due", value: money(input.due), color: DUE },
    { label: "Late", value: money(input.late), color: LATE },
    { label: "Expenses", value: money(input.expenses), color: GREEN },
  ]);

  const lines = attentionLines(input);
  const attentionH = px(38) + lines.length * px(20) + px(16);
  ctx.save();
  roundRect(ctx, left, cursor, px(540), attentionH, px(12));
  ctx.fillStyle = WHITE;
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = GOLD;
  ctx.fillRect(left, cursor, px(6), attentionH);
  ctx.font = `600 ${px(14)}px ${displayFont()}`;
  ctx.fillStyle = GREEN;
  ctx.fillText("Areas Needing Attention", left + px(20), cursor + px(28));
  ctx.fillStyle = GOLD;
  ctx.fillRect(left + px(20), cursor + px(34), px(36), px(2));
  ctx.font = `400 ${px(11)}px ${bodyFont()}`;
  ctx.fillStyle = GREEN;
  lines.forEach((line, index) => {
    ctx.fillText(`•  ${line}`, left + px(20), cursor + px(58) + index * px(20));
  });

  ctx.fillStyle = GOLD;
  ctx.fillRect(px(36), px(758), px(540), px(1));
  ctx.font = `500 ${px(8.5)}px ${bodyFont()}`;
  ctx.fillStyle = MUTED;
  ctx.fillText("Generated securely by OurDugsi · Private school report", left, px(776));
  return canvas;
}

function encodePdfString(value: string) {
  return new TextEncoder().encode(value);
}

function joinBytes(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

function downloadJpegPdf(jpeg: Uint8Array, width: number, height: number, filename: string) {
  const objects: Uint8Array[] = [
    encodePdfString("<< /Type /Catalog /Pages 2 0 R >>\n"),
    encodePdfString("<< /Type /Pages /Kids [3 0 R] /Count 1 >>\n"),
    encodePdfString("<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>\n"),
    joinBytes([
      encodePdfString(`<< /Type /XObject /Subtype /Image /Width ${width} /Height ${height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpeg.length} >>\nstream\n`),
      jpeg,
      encodePdfString("\nendstream\n"),
    ]),
  ];
  const content = "q 612 0 0 792 0 0 cm /Im0 Do Q\n";
  objects.push(encodePdfString(`<< /Length ${content.length} >>\nstream\n${content}endstream\n`));

  const header = encodePdfString("%PDF-1.4\n");
  const chunks = [header];
  let offset = header.length;
  const xref = [0];
  objects.forEach((body, index) => {
    const object = joinBytes([encodePdfString(`${index + 1} 0 obj\n`), body, encodePdfString("endobj\n")]);
    xref.push(offset);
    chunks.push(object);
    offset += object.length;
  });
  chunks.push(encodePdfString([
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
  ].join("\n")));

  const blob = new Blob(chunks, { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export async function downloadLeadershipPdf(input: LeadershipReportInput) {
  const image = await headerImage(input.schoolImageUrl);
  let canvas = await paint(input, image);
  let blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) {
    canvas = await paint(input, await loadImage(DEFAULT_IMAGE));
    blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  }
  if (!blob) throw new Error("Could not create the weekly report.");
  downloadJpegPdf(new Uint8Array(await blob.arrayBuffer()), canvas.width, canvas.height, "weekly-leadership-report.pdf");
}
