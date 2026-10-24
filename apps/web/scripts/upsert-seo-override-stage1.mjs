#!/usr/bin/env node
/**
 * Upsert Stage-1 SeoOverride rows from scripts/data/seo-override-stage1.json.
 * Usage on MSK:
 *   cd /opt/daibilet && set -a && source ./.env && set +a
 *   node --import ./packages/db/node_modules/tsx/dist/loader.mjs apps/web/scripts/upsert-seo-override-stage1.mjs
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prisma, disconnectPrisma } from '@daibilet/db';

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const dataPath = join(root, 'scripts/data/seo-override-stage1.json');
const rows = JSON.parse(readFileSync(dataPath, 'utf8'));

function normalize(value) {
  return String(value || '')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/ДайБилет/g, 'Дайбилет');
}

async function main() {
  let upserted = 0;
  for (const raw of rows) {
    const row = {
      citySlug: String(raw.citySlug || '').trim(),
      landingSlug: String(raw.landingSlug || '').trim(),
      customTitle: normalize(raw.customTitle),
      customDescription: normalize(raw.customDescription),
      customH1: normalize(raw.customH1),
      customText: normalize(raw.customText),
    };
    if (!row.citySlug || !row.landingSlug) continue;
    await prisma.seoOverride.upsert({
      where: {
        citySlug_landingSlug: {
          citySlug: row.citySlug,
          landingSlug: row.landingSlug,
        },
      },
      create: row,
      update: {
        customTitle: row.customTitle,
        customDescription: row.customDescription,
        customH1: row.customH1,
        customText: row.customText,
      },
    });
    upserted += 1;
    console.log(`OK ${row.citySlug}/${row.landingSlug} textLen=${row.customText.length}`);
  }
  console.log(`upserted=${upserted}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectPrisma();
  });
