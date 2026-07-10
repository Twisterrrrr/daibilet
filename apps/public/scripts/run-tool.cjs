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

const task = process.argv[2];

if (task === 'typecheck') {
  run('tsc', ['--noEmit', '-p', 'tsconfig.json']);
} else if (task === 'build') {
  run('tsc', ['--noEmit', '-p', 'tsconfig.json']);
  run('vite', ['build']);
  fs.copyFileSync(path.join(appDir, 'data.js'), path.join(appDir, 'dist', 'data.js'));
} else if (task === 'dev') {
  run('vite', ['--host', '127.0.0.1', '--port', process.env.PUBLIC_PORT || '5178']);
} else if (task === 'preview') {
  run('vite', ['preview', '--host', '127.0.0.1', '--port', process.env.PUBLIC_PORT || '5178']);
} else {
  console.error(`Unknown public task: ${task}`);
  process.exit(1);
}
