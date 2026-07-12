const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appDir = path.resolve(__dirname, '..');
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

function run(command, args) {
  const result = spawnSync(pnpm, ['exec', command, ...args], {
    cwd: appDir,
    stdio: 'inherit',
    shell: true,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

function copyFallbackData() {
  const source = path.join(appDir, 'data.js');
  const targetDir = path.join(appDir, 'public');
  const target = path.join(targetDir, 'data.js');
  if (!fs.existsSync(source)) return;
  fs.mkdirSync(targetDir, { recursive: true });
  fs.copyFileSync(source, target);
}

function removeTypecheckCache() {
  const cacheFile = path.join(appDir, 'tsconfig.tsbuildinfo');
  if (fs.existsSync(cacheFile)) fs.rmSync(cacheFile, { force: true });
}

const task = process.argv[2];

if (task === 'typecheck') {
  removeTypecheckCache();
  run('next', ['typegen']);
  run('tsc', ['--noEmit', '-p', 'tsconfig.json']);
} else if (task === 'build') {
  copyFallbackData();
  run('next', ['build']);
} else if (task === 'dev') {
  copyFallbackData();
  run('next', ['dev', '--hostname', '127.0.0.1', '--port', process.env.PUBLIC_PORT || '5178']);
} else if (task === 'preview') {
  copyFallbackData();
  run('next', ['start', '--hostname', '127.0.0.1', '--port', process.env.PUBLIC_PORT || '5178']);
} else {
  console.error(`Unknown public task: ${task}`);
  process.exit(1);
}
