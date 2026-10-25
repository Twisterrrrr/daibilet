const { spawnSync } = require('node:child_process');
const path = require('node:path');

const appDir = path.resolve(__dirname, '..');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(command, args) {
  const result = spawnSync(npm, ['exec', '--', command, ...args], {
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
} else if (task === 'dev') {
  run('vite', ['--host', '127.0.0.1', '--port', '5179']);
} else if (task === 'preview') {
  run('vite', ['preview', '--host', '127.0.0.1', '--port', '5179']);
} else {
  console.error(`Unknown supplier task: ${task}`);
  process.exit(1);
}
