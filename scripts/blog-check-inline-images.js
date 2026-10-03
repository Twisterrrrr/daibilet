#!/usr/bin/env node
/**
 * Проверка: у PUBLISHED статей есть 1-2 inline-фото в теле + файлы на диске.
 * Usage: node scripts/blog-check-inline-images.js
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlogMarkdownDir } from './lib/blog-content.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(rootDir, 'content', 'blog');
const imgDir = path.join(rootDir, 'apps', 'public', 'public', 'images', 'blog');

const articles = loadBlogMarkdownDir(contentDir);
let missingBody = 0;
let missingFiles = 0;

for (const article of articles) {
  const status = String(article.meta?.status || '').toUpperCase();
  if (status !== 'PUBLISHED') continue;

  const body = String(article.body || '');
  const shortcodes = [...body.matchAll(/\[image\s+side=(?:left|right)\s+src="([^"]+)"(?:\s+alt="([^"]*)")?\]/gi)];
  const mdImgs = [...body.matchAll(/^!\[([^\]]*)\]\(([^)]+)\)/gm)];
  const srcs = [
    ...shortcodes.map((m) => m[1]),
    ...mdImgs.map((m) => m[2]),
  ].map((s) => String(s || '').trim());

  if (srcs.length < 1) {
    missingBody += 1;
    console.log(`[body] ${article.slug}: no inline images`);
    continue;
  }

  for (const src of srcs) {
    const file = src.replace(/^\/images\/blog\//, '');
    const full = path.join(imgDir, file);
    if (!fs.existsSync(full)) {
      missingFiles += 1;
      console.log(`[file] ${article.slug}: missing ${file}`);
    }
  }
}

console.log(
  `blog-check-inline-images: published missing body=${missingBody}, missing files=${missingFiles}`,
);
process.exit(missingBody || missingFiles ? 1 : 0);
