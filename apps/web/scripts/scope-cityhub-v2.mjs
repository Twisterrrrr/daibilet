// One-off: scope the extracted cityhub_Perm.html CSS under `.cityhub-v2`
// so its `:root`/global rules cannot clobber app globals (e.g. `--muted`).
import fs from 'node:fs';

const cssPath = new URL('../src/styles/cityhub-v2.css', import.meta.url);
const SCOPE = '.cityhub-v2';
let css = fs.readFileSync(cssPath, 'utf8');

// Page-global element resets are redundant with Tailwind preflight and would
// fight utility classes inside the scope (`.cityhub-v2 a{color:inherit}` has
// higher specificity than `.text-accent`, so a scoped `a` reset breaks links).
css = css.replace(/^[ \t]*(?:html|body|img|button|a|\*)\{[^}]*\}\s*\n/gm, '');

// Drop designer section comments before scanning, so they are never parsed as
// part of a selector list (they sit between rules like `/* HEADER */`).
css = css.replace(/\/\*[\s\S]*?\*\//g, '');

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

// `:root` was kept verbatim by the scan; convert it to the scope block so the
// custom properties resolve inside `.cityhub-v2` and not globally.
out = out.replace(':root{', `${SCOPE}{`);

fs.writeFileSync(cssPath, out);
console.log(`scoped CSS written (${out.length} chars)`);