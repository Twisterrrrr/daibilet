import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CITY_INFO } from '../apps/web/src/lib/cityInfo-data.ts';
import { cityIdentitySlides } from '../apps/web/src/lib/city-hub-local-flavor.ts';
import { resolveVenueHeroImage } from '../apps/web/src/lib/city-place-images.ts';

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(repo, 'apps/public/public');
const threshold = Number(process.env.AHASH_MAX || 3);
const hashCache = new Map<string, Promise<bigint | null>>();

function localFile(url: string): string | null {
  const clean = url.split(/[?#]/, 1)[0];
  const file = path.join(publicDir, clean.replace(/^\/+/, ''));
  return fs.existsSync(file) ? file : null;
}

function imageHash(url: string): Promise<bigint | null> {
  const file = localFile(url);
  if (!file) return Promise.resolve(null);
  if (!hashCache.has(file)) {
    hashCache.set(
      file,
      sharp(file)
        .rotate()
        .greyscale()
        .resize(8, 8, { fit: 'fill' })
        .raw()
        .toBuffer({ resolveWithObject: true })
        .then(({ data }) => {
          const avg = data.reduce((sum, value) => sum + value, 0) / data.length;
          let hash = 0n;
          for (let i = 0; i < data.length; i++) if (data[i] >= avg) hash |= 1n << BigInt(i);
          return hash;
        })
        .catch(() => null),
    );
  }
  return hashCache.get(file)!;
}

function distance(a: bigint, b: bigint): number {
  let bits = a ^ b;
  let count = 0;
  while (bits) {
    count += Number(bits & 1n);
    bits >>= 1n;
  }
  return count;
}

async function main() {
  const overlaps: Array<Record<string, unknown>> = [];
  const missing: Array<Record<string, unknown>> = [];
  const cities: string[] = [];
  let cityCount = 0;
  let slideCount = 0;

  for (const [city, info] of Object.entries(CITY_INFO)) {
  const slides = cityIdentitySlides(city);
  if (!slides.length) continue;
  cityCount++;
  cities.push(city);
  const identity = slides.flatMap((slide) => {
    const image = String(slide.imageSrc || '').trim();
    if (!image || !localFile(image)) {
      missing.push({ city, slide: slide.id, image: image || null, section: 'identity' });
      return [];
    }
    slideCount++;
    return [{ slide: slide.id, image, hash: imageHash(image) }];
  });
  const places = (info.mustSee || []).flatMap((place) => {
    const slug = String(place.venueSlug || place.locationSlug || '').trim();
    const image = resolveVenueHeroImage(slug, null);
    if (!image || !localFile(image)) return [];
    return [{ slug, image, hash: imageHash(image) }];
  });

  const [identityHashes, placeHashes] = await Promise.all([
    Promise.all(identity.map(async (row) => ({ ...row, hash: await row.hash }))),
    Promise.all(places.map(async (row) => ({ ...row, hash: await row.hash }))),
  ]);
  for (const slide of identityHashes) {
    if (slide.hash == null) continue;
    for (const place of placeHashes) {
      if (place.hash == null) continue;
      const d = distance(slide.hash, place.hash);
      if (d <= threshold) {
        overlaps.push({ city, slide: slide.slide, identityImage: slide.image, place: place.slug, placeImage: place.image, distance: d });
      }
    }
  }
  }

  const untouchedCities = new Set(['moscow', 'saint-petersburg']);
  const unprotectedOverlapCount = overlaps.filter((row) => !untouchedCities.has(String(row.city))).length;
  const report = {
    cityCount,
    cities,
    slideCount,
    threshold,
    overlapCount: overlaps.length,
    unprotectedOverlapCount,
    missing,
    overlaps,
  };
  const output = path.join(repo, 'scripts/city-identity-overlap-audit.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, overlaps: overlaps.slice(0, 100) }, null, 2));
  console.log(`Wrote ${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
