const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'apps/public/src/components/trust');

const files = [
  { src: 'tmp-legacy-legal.tsx', name: 'LegalPageContent.tsx', exportName: 'LegalPageContent' },
  { src: 'tmp-legacy-privacy.tsx', name: 'PrivacyPageContent.tsx', exportName: 'PrivacyPageContent' },
  { src: 'tmp-legacy-offer.tsx', name: 'OfferPageContent.tsx', exportName: 'OfferPageContent' },
  { src: 'tmp-legacy-requisites.tsx', name: 'RequisitesPageContent.tsx', exportName: 'RequisitesPageContent' },
];

fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  let text = fs.readFileSync(path.join(root, file.src), 'utf8');
  text = text
    .replace(/import type \{ Metadata \} from 'next';\n/g, '')
    .replace(/import Link from 'next\/link';\n/g, '')
    .replace(/export const metadata:[\s\S]*?};\n\n/g, '')
    .replace(/export default function (\w+)\(\)/, `export function ${file.exportName}()`)
    .replace(/<Link(\s)/g, '<a$1')
    .replace(/<\/Link>/g, '</a>');

  fs.writeFileSync(path.join(outDir, file.name), text, 'utf8');
  console.log('wrote', file.name);
}
