/**
 * Client-side «PDF с картой» for My Day.
 * Draws OSM static map (same-origin tile proxy) + itinerary on canvas, wraps
 * JPEG pages in a real PDF blob and downloads `.pdf`. No jspdf dependency.
 *
 * Do not `window.open(..., 'noopener')` then print: browsers return `null`
 * for that features string, and the old fallback saved `moi-den-karta.jpg`.
 */

export type DayRoutePdfStop = {
  id: string;
  title: string;
  latitude: number;
  longitude: number;
  address?: string | null;
  tag?: string | null;
  timeLabel?: string | null;
  dwellLabel?: string | null;
};

export type DayRoutePdfPayload = {
  title: string;
  subtitle: string;
  summary: string[];
  stops: DayRoutePdfStop[];
  /** Ordered rows including notes / legs between stops. */
  rows: Array<
    | { kind: 'stop'; index: number; stop: DayRoutePdfStop }
    | { kind: 'note'; text: string }
    | { kind: 'leg'; text: string }
  >;
};

const TILE = 256;
const lon2x = (lon: number, z: number) => ((lon + 180) / 360) * 2 ** z;
const lat2y = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180;
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * 2 ** z;
};

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function drawMap(
  ctx: CanvasRenderingContext2D,
  stops: DayRoutePdfStop[],
  x: number,
  y: number,
  w: number,
  h: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.fillStyle = '#e8eeec';
  ctx.fillRect(x, y, w, h);

  if (!stops.length) {
    ctx.restore();
    return;
  }

  const lats = stops.map((s) => s.latitude);
  const lons = stops.map((s) => s.longitude);
  const pad = 0.0025;
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLon = Math.min(...lons) - pad;
  const maxLon = Math.max(...lons) + pad;

  let zoom = 16;
  while (zoom > 3) {
    const spanX = (lon2x(maxLon, zoom) - lon2x(minLon, zoom)) * TILE;
    const spanY = (lat2y(minLat, zoom) - lat2y(maxLat, zoom)) * TILE;
    if (spanX <= w && spanY <= h) break;
    zoom -= 1;
  }

  const centerX = (lon2x(minLon, zoom) + lon2x(maxLon, zoom)) / 2;
  const centerY = (lat2y(minLat, zoom) + lat2y(maxLat, zoom)) / 2;
  const originPx = { x: centerX * TILE - w / 2, y: centerY * TILE - h / 2 };
  const project = (lat: number, lon: number) => ({
    x: x + lon2x(lon, zoom) * TILE - originPx.x,
    y: y + lat2y(lat, zoom) * TILE - originPx.y,
  });

  const first = Math.floor(originPx.x / TILE);
  const last = Math.floor((originPx.x + w) / TILE);
  const top = Math.floor(originPx.y / TILE);
  const bottom = Math.floor((originPx.y + h) / TILE);

  const jobs: Promise<void>[] = [];
  for (let tx = first; tx <= last; tx++) {
    for (let ty = top; ty <= bottom; ty++) {
      const wrapped = ((tx % 2 ** zoom) + 2 ** zoom) % 2 ** zoom;
      // Same-origin proxy: OSM tiles without Carto «API KEY REQUIRED» watermark.
      const url = `/api/osm-tile/${zoom}/${wrapped}/${ty}`;
      jobs.push(
        loadImage(url).then((img) => {
          if (!img) return;
          ctx.drawImage(img, x + tx * TILE - originPx.x, y + ty * TILE - originPx.y, TILE, TILE);
        }),
      );
    }
  }
  await Promise.all(jobs);

  ctx.strokeStyle = '#0f766e';
  ctx.lineWidth = 4;
  ctx.setLineDash([2, 10]);
  ctx.lineCap = 'round';
  ctx.beginPath();
  stops.forEach((s, i) => {
    const p = project(s.latitude, s.longitude);
    if (i === 0) ctx.moveTo(p.x, p.y);
    else ctx.lineTo(p.x, p.y);
  });
  ctx.stroke();
  ctx.setLineDash([]);

  stops.forEach((s, i) => {
    const p = project(s.latitude, s.longitude);
    ctx.beginPath();
    ctx.arc(p.x, p.y, 15, 0, Math.PI * 2);
    ctx.fillStyle = '#0f766e';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(i + 1), p.x, p.y + 1);
  });

  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.fillRect(x, y + h - 20, 230, 20);
  ctx.fillStyle = '#4b5563';
  ctx.font = '12px Arial, sans-serif';
  ctx.fillText('© OpenStreetMap contributors', x + 6, y + h - 6);
  ctx.restore();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  font: string,
  maxWidth: number,
): string[] {
  ctx.font = font;
  const words = text.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (ctx.measureText(candidate).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else line = candidate;
  }
  if (line) lines.push(line);
  return lines;
}

/** Compose canvases and download a real PDF (JPEG pages in a PDF wrapper). */
export async function exportDayRoutePdfWithMap(payload: DayRoutePdfPayload): Promise<void> {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const W = 1240;
  const H = 1754;
  const M = 70;
  const pages: HTMLCanvasElement[] = [];

  const newPage = () => {
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('canvas');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, W, H);
    pages.push(canvas);
    return ctx;
  };

  let ctx = newPage();
  let y = M;

  const ensure = (needed: number) => {
    if (y + needed <= H - M) return;
    ctx = newPage();
    y = M;
  };

  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 20px Arial, sans-serif';
  ctx.fillText('ДАЙБИЛЕТ · ПЛАН ДНЯ', M, y);
  y += 46;
  ctx.fillStyle = '#111827';
  ctx.font = 'bold 46px Arial, sans-serif';
  ctx.fillText(payload.title, M, y);
  y += 38;
  ctx.fillStyle = '#4b5563';
  ctx.font = '22px Arial, sans-serif';
  ctx.fillText(payload.subtitle, M, y);
  y += 34;
  for (const line of payload.summary) {
    ctx.fillText(line, M, y);
    y += 30;
  }
  y += 12;

  if (payload.stops.length) {
    const mapH = 520;
    await drawMap(ctx, payload.stops, M, y, W - M * 2, mapH);
    ctx.strokeStyle = '#d8e0dd';
    ctx.lineWidth = 2;
    ctx.strokeRect(M, y, W - M * 2, mapH);
    y += mapH + 40;
  }

  for (const row of payload.rows) {
    if (row.kind === 'leg') {
      ensure(40);
      ctx.fillStyle = '#6b7280';
      ctx.font = '20px Arial, sans-serif';
      ctx.fillText(`↓ ${row.text}`, M + 60, y);
      y += 40;
      continue;
    }
    if (row.kind === 'note') {
      const lines = wrapText(ctx, row.text, 'italic 22px Arial, sans-serif', W - M * 2 - 90);
      ensure(lines.length * 30 + 24);
      ctx.fillStyle = '#7c5c12';
      ctx.font = 'italic 22px Arial, sans-serif';
      for (const line of lines) {
        ctx.fillText(`✎ ${line}`, M + 60, y);
        y += 30;
      }
      y += 16;
      continue;
    }

    const titleLines = wrapText(ctx, row.stop.title, 'bold 26px Arial, sans-serif', W - M * 2 - 90);
    ensure(titleLines.length * 34 + 70);
    const top = y - 22;
    ctx.beginPath();
    ctx.arc(M + 22, top + 10, 20, 0, Math.PI * 2);
    ctx.fillStyle = '#0f766e';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 20px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(String(row.index), M + 22, top + 17);
    ctx.textAlign = 'left';

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 26px Arial, sans-serif';
    for (const line of titleLines) {
      ctx.fillText(line, M + 60, y);
      y += 34;
    }

    ctx.fillStyle = '#4b5563';
    ctx.font = '20px Arial, sans-serif';
    const meta = [row.stop.timeLabel, row.stop.dwellLabel, row.stop.tag, row.stop.address]
      .filter(Boolean)
      .join(' · ');
    if (meta) {
      for (const line of wrapText(ctx, meta, '20px Arial, sans-serif', W - M * 2 - 90)) {
        ctx.fillText(line, M + 60, y);
        y += 28;
      }
    }
    y += 22;
  }

  for (let i = 0; i < pages.length; i++) {
    const pctx = pages[i]!.getContext('2d')!;
    pctx.fillStyle = '#9ca3af';
    pctx.font = '18px Arial, sans-serif';
    pctx.fillText(`daibilet.ru · страница ${i + 1} из ${pages.length}`, M, H - 36);
  }

  const jpegPages = await Promise.all(
    pages.map(async (canvas) => ({
      width: canvas.width,
      height: canvas.height,
      jpeg: await canvasToJpegBytes(canvas),
    })),
  );
  const pdf = buildPdfFromJpegPages(jpegPages);
  downloadBlob(new Blob([pdf], { type: 'application/pdf' }), 'moi-den.pdf');
}

export type JpegPdfPage = {
  width: number;
  height: number;
  jpeg: Uint8Array;
};

/** Embed RGB JPEG pages into a minimal PDF (A4). Exported for unit tests. */
export function buildPdfFromJpegPages(pages: JpegPdfPage[]): Uint8Array {
  if (!pages.length) throw new Error('pdf: empty');

  const A4_W = 595.28;
  const A4_H = 841.89;
  const encoder = new TextEncoder();
  const ascii = (value: string) => encoder.encode(value);
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let size = 0;

  const push = (part: Uint8Array | string) => {
    const bytes = typeof part === 'string' ? ascii(part) : part;
    chunks.push(bytes);
    size += bytes.length;
  };

  const beginObj = (id: number) => {
    offsets[id] = size;
    push(`${id} 0 obj\n`);
  };

  const endObj = () => push('endobj\n');

  push('%PDF-1.4\n');
  push(new Uint8Array([0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));

  beginObj(1);
  push('<< /Type /Catalog /Pages 2 0 R >>\n');
  endObj();

  const kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' ');
  beginObj(2);
  push(`<< /Type /Pages /Kids [${kids}] /Count ${pages.length} >>\n`);
  endObj();

  pages.forEach((page, i) => {
    const pageId = 3 + i * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const content = `q\n${A4_W} 0 0 ${A4_H} 0 0 cm\n/Im0 Do\nQ\n`;

    beginObj(pageId);
    push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${A4_W} ${A4_H}] /Contents ${contentId} 0 R /Resources << /XObject << /Im0 ${imageId} 0 R >> >> >>\n`,
    );
    endObj();

    beginObj(contentId);
    push(`<< /Length ${ascii(content).length} >>\nstream\n`);
    push(content);
    push('endstream\n');
    endObj();

    beginObj(imageId);
    push(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    push(page.jpeg);
    push('\nendstream\n');
    endObj();
  });

  const xrefStart = size;
  const objCount = 3 + pages.length * 3;
  push(`xref\n0 ${objCount}\n`);
  push('0000000000 65535 f \n');
  for (let id = 1; id < objCount; id++) {
    push(`${String(offsets[id] ?? 0).padStart(10, '0')} 00000 n \n`);
  }
  push(`trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`);

  const out = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function canvasToJpegBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('jpeg'));
          return;
        }
        void blob.arrayBuffer().then((buffer) => resolve(new Uint8Array(buffer)), reject);
      },
      'image/jpeg',
      0.92,
    );
  });
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}
