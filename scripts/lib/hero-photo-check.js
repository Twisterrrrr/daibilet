/**
 * Hero photo assessment for organizer-email applies (owner task 2026-10-18,
 * variant A): a good organizer photo replaces the event cover image.
 *
 * Rules from the owner:
 *   - resolution >= 800x600;
 *   - horizontal only (16:9 or 4:3) - verticals stay in staging for the
 *     future gallery (variant B), they break the hero layout;
 *   - not too dark / not blown out (when luminance is provided);
 *   - better than the current cover when one exists.
 *
 * Watermarks / collages / full-screen logos are NOT auto-detected - that stays
 * on the operator during review (rule: "better a mediocre own cover than a
 * bad organizer photo").
 */

/** Read width/height from PNG, JPEG or WebP headers. Returns null if unknown. */
export function parseImageDimensions(buffer) {
  const b = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer || '');
  if (b.length < 12) return null;

  // PNG: 8-byte signature, then IHDR with width/height at 16..24.
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return { width: b.readUInt32BE(16), height: b.readUInt32BE(20), format: 'png' };
  }

  // JPEG: scan for SOFn marker (0xC0-0xCF, not C4/C8/CC).
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) {
        i += 1;
        continue;
      }
      const marker = b[i + 1];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5), format: 'jpeg' };
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd9)) {
        i += 2;
        continue;
      }
      const segLen = b.readUInt16BE(i + 2);
      i += 2 + segLen;
    }
    return null;
  }

  // WebP: RIFF container, payload type at offset 12.
  if (b.length >= 30 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') {
    const chunk = b.toString('ascii', 12, 16);
    if (chunk === 'VP8 ') {
      return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff, format: 'webp' };
    }
    if (chunk === 'VP8L') {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, format: 'webp' };
    }
    if (chunk === 'VP8X') {
      return {
        width: (b.readUIntLE(24, 3) & 0xffffff) + 1,
        height: (b.readUIntLE(27, 3) & 0xffffff) + 1,
        format: 'webp',
      };
    }
  }

  return null;
}

export const MIN_HERO_WIDTH = 800;
export const MIN_HERO_HEIGHT = 600;

/**
 * Assess one photo for the hero slot. `meanLuminance` is optional (0..1);
 * when missing, the brightness check is skipped and reported as 'unchecked'.
 *
 * Returns { ok, reason, score } - higher score = better cover candidate.
 */
export function assessHeroPhoto(dims, meanLuminance = null) {
  if (!dims || !dims.width || !dims.height) return { ok: false, reason: 'unreadable', score: 0 };
  const { width, height } = dims;
  if (width < MIN_HERO_WIDTH || height < MIN_HERO_HEIGHT) {
    return { ok: false, reason: `too small (${width}x${height})`, score: 0 };
  }
  if (height >= width) {
    return { ok: false, reason: `not horizontal (${width}x${height})`, score: 0 };
  }
  const ratio = width / height;
  if (ratio < 1.2 || ratio > 2.2) {
    return { ok: false, reason: `aspect out of range (${ratio.toFixed(2)})`, score: 0 };
  }
  if (meanLuminance != null) {
    if (meanLuminance < 0.12) return { ok: false, reason: 'too dark', score: 0 };
    if (meanLuminance > 0.92) return { ok: false, reason: 'blown out', score: 0 };
  }
  // Prefer shapes close to 16:9 (1.78) or 4:3 (1.33); bigger resolution wins ties.
  const shapeScore = Math.min(Math.abs(ratio - 16 / 9), Math.abs(ratio - 4 / 3)) < 0.12 ? 1 : 0;
  const score = shapeScore * 10000 + Math.min(width, 4000);
  return { ok: true, reason: meanLuminance == null ? 'ok (brightness unchecked)' : 'ok', score };
}

/** Pick the best hero candidate among assessed photos; null when none qualify. */
export function pickHeroCandidate(candidates) {
  const ok = (candidates || []).filter((c) => c && c.assessment && c.assessment.ok);
  if (!ok.length) return null;
  return ok.reduce((best, c) => (c.assessment.score > best.assessment.score ? c : best));
}
