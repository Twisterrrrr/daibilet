// Reusable one-off: extract <style> from a mockup HTML file, scope every
// selector under a wrapper class so the fixture CSS cannot clobber app globals
// (its `:root` / `body` / `a` rules), and write the result to a CSS file in the
// repo. Usage:
//   node apps/web/scripts/scope-html-css.mjs <mockup.html> <out.css> [scopeClass]
import fs from 'node:fs';

const [, , htmlPath, outPath, scopeArg] = process.argv;
const SCOPE = scopeArg || '.v2';

if (!htmlPath || !outPath) {
  console.error('usage: node scope-html-css.mjs <in.html> <out.css> [scope]');
  process.exit(1);
}

let css = [...fs.readFileSync(htmlPath, 'utf8').matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)]
  .map((m) => m[1])
  .join('\n');

// Designer section comments would otherwise be parsed as selector fragments.
css = css.replace(/\/\*[\s\S]*?\*\//g, '');
// Page-global resets are redundant with Tailwind preflight and would fight
// utility classes inside the scope (a scoped `a{color:inherit}` beats `.text-accent`).
css = css.replace(/^[ \t]*(?:html|body|img|button|a|\*)\{[^}]*\}\s*\n/gm, '');

function splitSelectors(s) {
  const parts = [];
  let cur = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(cur.trim());
      cur = '';
    } else {
      cur += ch;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

function prefixSelectors(header) {
  const lead = (header.match(/^\s*/) || [''])[0];
  const trail = (header.match(/\s*$/) || [''])[0];
  const core = header.trim();
  if (!core) return header;
  return lead + splitSelectors(core).map((p) => `${SCOPE} ${p}`).join(', ') + trail;
}

let out = '';
let buf = '';
const stack = [];
for (let i = 0; i < css.length; i += 1) {
  const ch = css[i];
  if (ch === '{') {
    const header = buf;
    buf = '';
    const t = header.trim();
    if (t.startsWith('@') || t === ':root') {
      out += header + '{';
    } else {
      out += prefixSelectors(header) + '{';
    }
    stack.push('x');
  } else if (ch === '}') {
    out += buf + '}';
    buf = '';
    stack.pop();
  } else {
    buf += ch;
  }
}
out += buf;

// `:root` becomes the scope block so custom properties resolve inside it only.
out = out.replace(/:root\s*\{/, `${SCOPE}{`);

fs.writeFileSync(outPath, out);
console.log(`scoped CSS written to ${outPath} (${out.length} chars)`);