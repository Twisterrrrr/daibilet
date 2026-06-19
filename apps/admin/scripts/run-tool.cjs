const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const appDir = path.resolve(__dirname, '..');
const oldBin = 'D:\\coding\\SPBBOATS\\packages\\frontend-admin-v4\\node_modules\\.bin';

function run(command, args) {
  const executable = path.join(oldBin, command);
  const line = `& '${executable}' ${args.join(' ')}`;
  const result = spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', line], {
    cwd: appDir,
    stdio: 'inherit',
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}

const task = process.argv[2];

if (task === 'typecheck') {
  run('tsc.cmd', ['--noEmit', '-p', 'tsconfig.json']);
} else if (task === 'build') {
  run('tsc.cmd', ['--noEmit', '-p', 'tsconfig.json']);
  run('vite.cmd', ['build', '--configLoader', 'runner']);
  fs.copyFileSync(path.join(appDir, 'data.js'), path.join(appDir, 'dist', 'data.js'));
} else if (task === 'dev') {
  run('vite.cmd', ['--host', '127.0.0.1', '--port', '5176', '--configLoader', 'runner']);
} else if (task === 'preview') {
  run('vite.cmd', ['preview', '--host', '127.0.0.1', '--port', '5176']);
} else {
  console.error(`Unknown admin task: ${task}`);
  process.exit(1);
}
