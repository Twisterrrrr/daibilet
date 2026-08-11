/**
 * Client-side «PDF с картой» for My Day.
 * Draws OSM/Carto static map + itinerary on canvas, then opens print dialog
 * (user saves as PDF). No jspdf dependency required.
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
      const url = `https://a.basemaps.cartocdn.com/rastertiles/voyager/${zoom}/${wrapped}/${ty}@2x.png`;
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
  ctx.fillText('© OpenStreetMap, © CARTO', x + 6, y + h - 6);
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

/** Compose canvases and open browser print (Save as PDF). */
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

  const images = pages.map((c, i) => {
    const pctx = c.getContext('2d')!;
    pctx.fillStyle = '#9ca3af';
    pctx.font = '18px Arial, sans-serif';
    pctx.fillText(`daibilet.ru · страница ${i + 1} из ${pages.length}`, M, H - 36);
    return c.toDataURL('image/jpeg', 0.92);
  });

  const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"/><title>${escapeHtml(
    payload.title,
  )}</title>
<style>
  @page { size: A4; margin: 0; }
  body { margin: 0; background: #fff; }
  img { display: block; width: 100%; page-break-after: always; }
  img:last-child { page-break-after: auto; }
  .hint { display:none; }
  @media screen {
    body { background: #e5e7eb; padding: 16px; }
    img { max-width: 720px; margin: 0 auto 16px; box-shadow: 0 8px 24px rgba(0,0,0,.12); }
    .hint { display:block; text-align:center; font: 14px/1.4 system-ui,sans-serif; color:#334155; margin-bottom:12px; }
  }
</style></head><body>
<p class="hint">В диалоге печати выберите «Сохранить как PDF».</p>
${images.map((src) => `<img src="${src}" alt="Страница маршрута"/>`).join('')}
<script>window.onload=function(){setTimeout(function(){window.print();},200);}</script>
</body></html>`;

  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    // Popup blocked - fall back to downloading first page JPEG.
    const a = document.createElement('a');
    a.href = images[0]!;
    a.download = 'moi-den-karta.jpg';
    a.click();
    return;
  }
  win.document.open();
  win.document.write(html);
  win.document.close();
}

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
