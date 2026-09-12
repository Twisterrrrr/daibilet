#!/usr/bin/env node
/**
 * Run apps/web lib unit tests via node:test + tsx.
 * Usage: node scripts/run-unit-tests.mjs [--ci]
 *   --ci  only files listed in ci-test-files.txt (stable logic tests)
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const libRoot = join(webRoot, 'src', 'lib');
const ciOnly = process.argv.includes('--ci');

function walkTests(dir) {
  const out = [];
  for (const ent of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, ent.name);
    if (ent.isDirectory()) out.push(...walkTests(path));
    else if (ent.name.endsWith('.test.ts')) out.push(path);
  }
  return out;
}

function resolveTsxBin() {
  const candidates = [
    join(webRoot, 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    join(webRoot, '..', '..', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
    join(webRoot, '..', 'backend', 'node_modules', 'tsx', 'dist', 'cli.mjs'),
  ];
  for (const candidate of candidates) {
    try {
      readFileSync(candidate);
      return candidate;
    } catch {
      // try next
    }
  }
  return null;
}

let tests;
if (ciOnly) {
  const listPath = join(webRoot, 'scripts', 'ci-test-files.txt');
  tests = readFileSync(listPath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => join(webRoot, line.replace(/\r/g, '')));
  console.log(`CI mode: ${tests.length} test file(s) from ci-test-files.txt`);
} else {
  tests = walkTests(libRoot);
}

if (tests.length === 0) {
  console.error('No test files to run');
  process.exit(1);
}

const tsxBin = resolveTsxBin();
const rel = tests.map((f) => relative(webRoot, f));
const args = tsxBin ? [tsxBin, '--test', ...rel] : ['--import', 'tsx', '--test', ...rel];
const result = spawnSync(process.execPath, args, { cwd: webRoot, stdio: 'inherit' });
console.log(`Ran ${tests.length} test file(s)`);
process.exit(result.status ?? 1);
