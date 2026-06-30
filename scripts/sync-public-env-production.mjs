import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'apps', 'public');
const envPath = path.join(root, '.env.production');
const lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8').split('\n') : [];
const map = new Map();

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
  const index = trimmed.indexOf('=');
  map.set(trimmed.slice(0, index), trimmed.slice(index + 1));
}

map.set('VITE_DAIBILET_API_URL', map.get('VITE_DAIBILET_API_URL') || 'https://daibilet.ru');

const token = process.env.TC_WIDGET_TOKEN?.trim();
if (token) {
  map.set('VITE_TC_WIDGET_TOKEN', token);
}

const output = [...map.entries()].map(([key, value]) => `${key}=${value}`).join('\n') + '\n';
fs.writeFileSync(envPath, output);
console.log(`Updated ${envPath} (${map.has('VITE_TC_WIDGET_TOKEN') ? 'with' : 'without'} VITE_TC_WIDGET_TOKEN)`);
