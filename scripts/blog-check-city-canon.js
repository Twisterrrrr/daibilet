#!/usr/bin/env node
/**
 * Проверка канона городов блога: не «Регионы», если в frontmatter есть конкретные города.
 * Usage: node scripts/blog-check-city-canon.js
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadBlogMarkdownDir, validateBlogCityCanon } from './lib/blog-content.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = path.join(rootDir, 'content', 'blog');
const articles = loadBlogMarkdownDir(contentDir);

const errors = [];
for (const article of articles) {
  errors.push(...validateBlogCityCanon(article));
}

if (errors.length) {
  for (const error of errors) console.error(`[city-canon] ${error}`);
  process.exit(1);
}

console.log(`blog-check-city-canon: ok (${articles.length} files)`);
