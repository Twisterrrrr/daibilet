/**
 * Deterministic unique catalog covers (Event/Venue) when provider CDN is missing.
 * Uses sharp SVG → JPEG; no external AI API (safe for nightly sync).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const WIDTH = 1600;
const HEIGHT = 1200;

const KIND_PALETTES = {
  museum_art_space: ['#b45309', '#7c2d12', '#1e293b'],
  theater: ['#be123c', '#881337', '#0f172a'],
  concert_hall: ['#6d28d9', '#312e81', '#0f172a'],
  club_bar_restaurant: ['#047857', '#115e59', '#0f172a'],
  bar: ['#c2410c', '#7c2d12', '#0f172a'],
  pier: ['#0369a1', '#0e7490', '#0f172a'],
  PIER: ['#0369a1', '#0e7490', '#0f172a'],
  HALL: ['#6d28d9', '#312e81', '#0f172a'],
  MUSEUM: ['#b45309', '#7c2d12', '#1e293b'],
  default: ['#334155', '#1e293b', '#0f172a'],
};

const CATEGORY_PALETTES = {
  Экскурсии: ['#0ea5e9', '#0369a1', '#0f172a'],
  'Музеи и арт': ['#d97706', '#92400e', '#1e293b'],
  Мероприятия: ['#e11d48', '#9f1239', '#0f172a'],
  'Активный отдых': ['#16a34a', '#166534', '#0f172a'],
  Развлечения: ['#db2777', '#9d174d', '#0f172a'],
};

function loadSharp(rootDir) {
  return createRequire(path.join(rootDir, 'apps/web/package.json'))('sharp');
}

export function catalogCoverHash(seed) {
  return crypto.createHash('sha1').update(String(seed || '')).digest('hex').slice(0, 12);
}

function paletteFor({ kind, category, seedHex }) {
  const fromKind = KIND_PALETTES[kind] || KIND_PALETTES[String(kind || '').toLowerCase()];
  if (fromKind) return fromKind;
  if (category && CATEGORY_PALETTES[category]) return CATEGORY_PALETTES[category];
  const n = Number.parseInt(seedHex.slice(0, 6), 16) || 0;
  const hues = [
    ['#334155', '#1e293b', '#0f172a'],
    ['#0f766e', '#115e59', '#0f172a'],
    ['#9a3412', '#7c2d12', '#1e293b'],
    ['#1d4ed8', '#1e3a8a', '#0f172a'],
    ['#a21caf', '#701a75', '#0f172a'],
  ];
  return hues[n % hues.length];
}

function buildCoverSvg({ seedHex, palette }) {
  const [c1, c2, c3] = palette;
  const a = Number.parseInt(seedHex.slice(0, 2), 16) / 255;
  const b = Number.parseInt(seedHex.slice(2, 4), 16) / 255;
  const c = Number.parseInt(seedHex.slice(4, 6), 16) / 255;
  const d = Number.parseInt(seedHex.slice(6, 8), 16) / 255;
  const cx1 = Math.round(200 + a * 1200);
  const cy1 = Math.round(150 + b * 900);
  const cx2 = Math.round(300 + c * 1000);
  const cy2 = Math.round(200 + d * 800);
  const r1 = Math.round(380 + a * 220);
  const r2 = Math.round(320 + b * 260);
  const rotate = Math.round(a * 40 - 20);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="55%" stop-color="${c2}"/>
      <stop offset="100%" stop-color="${c3}"/>
    </linearGradient>
    <radialGradient id="glow1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glow2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#f8fafc" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#f8fafc" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="band" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0"/>
      <stop offset="45%" stop-color="#ffffff" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <filter id="soft"><feGaussianBlur stdDeviation="28"/></filter>
  </defs>
  <rect width="100%" height="100%" fill="url(#bg)"/>
  <g transform="rotate(${rotate} ${WIDTH / 2} ${HEIGHT / 2})">
    <ellipse cx="${cx1}" cy="${cy1}" rx="${r1}" ry="${Math.round(r1 * 0.72)}" fill="url(#glow1)" filter="url(#soft)"/>
    <ellipse cx="${cx2}" cy="${cy2}" rx="${r2}" ry="${Math.round(r2 * 0.65)}" fill="url(#glow2)" filter="url(#soft)"/>
    <rect x="-200" y="${Math.round(HEIGHT * (0.28 + a * 0.2))}" width="${WIDTH + 400}" height="90" fill="url(#band)" opacity="0.9"/>
    <rect x="-200" y="${Math.round(HEIGHT * (0.58 + b * 0.15))}" width="${WIDTH + 400}" height="54" fill="url(#band)" opacity="0.55"/>
  </g>
  <rect width="100%" height="100%" fill="#0f172a" opacity="0.18"/>
</svg>`;
}

/**
 * Write a unique JPEG cover under apps/public (+ mirror to apps/web if present).
 * @returns public URL path e.g. /images/venues/generated/venue-auto-abc123.jpg
 */
export async function writeGeneratedCatalogCover(rootDir, options) {
  const {
    kind = 'venue',
    seed,
    venueKind = null,
    category = null,
    force = false,
  } = options;
  const seedHex = catalogCoverHash(seed);
  const folder = kind === 'event' ? 'events' : 'venues';
  const fileName = `${kind === 'event' ? 'evt' : 'venue'}-auto-${seedHex}.jpg`;
  const relUrl = `/images/${folder}/generated/${fileName}`;

  const publicPath = path.join(rootDir, 'apps/public/public', relUrl.replace(/^\//, ''));
  const webPath = path.join(rootDir, 'apps/web/public', relUrl.replace(/^\//, ''));
  fs.mkdirSync(path.dirname(publicPath), { recursive: true });

  if (!force && fs.existsSync(publicPath) && fs.statSync(publicPath).size > 1024) {
    if (fs.existsSync(path.dirname(webPath))) {
      fs.mkdirSync(path.dirname(webPath), { recursive: true });
      if (!fs.existsSync(webPath)) fs.copyFileSync(publicPath, webPath);
    }
    return relUrl;
  }

  const sharp = loadSharp(rootDir);
  const palette = paletteFor({ kind: venueKind, category, seedHex });
  const svg = buildCoverSvg({ seedHex, palette });
  const buffer = await sharp(Buffer.from(svg)).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  fs.writeFileSync(publicPath, buffer);
  if (fs.existsSync(path.join(rootDir, 'apps/web/public'))) {
    fs.mkdirSync(path.dirname(webPath), { recursive: true });
    fs.writeFileSync(webPath, buffer);
  }
  return relUrl;
}
