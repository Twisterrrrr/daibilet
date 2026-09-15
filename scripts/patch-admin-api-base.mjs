import fs from 'node:fs';
import path from 'node:path';

const pagesDir = path.resolve('apps/admin/src/pages');
const oldBlock =
  "const API_BASE_URL =\n  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_API_URL?: string } }).env?.VITE_DAIBILET_API_URL as string | undefined) ||\n  'http://127.0.0.1:4000';";

for (const file of fs.readdirSync(pagesDir)) {
  if (!file.endsWith('.tsx')) continue;
  const filePath = path.join(pagesDir, file);
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes(oldBlock)) continue;
  if (!content.includes("from '@/lib/admin-api'")) {
    const firstImportEnd = content.indexOf('\n', content.indexOf('import '));
    content = `${content.slice(0, firstImportEnd + 1)}import { ADMIN_API_BASE } from '@/lib/admin-api';\n${content.slice(firstImportEnd + 1)}`;
  }
  content = content.replace(oldBlock, 'const API_BASE_URL = ADMIN_API_BASE;');
  fs.writeFileSync(filePath, content);
  console.log('patched', file);
}
