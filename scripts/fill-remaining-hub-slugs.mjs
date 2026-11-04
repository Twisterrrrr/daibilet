/**
 * Fill any hub slug (locationSlug/venueSlug or ryazan loc/venue 4th arg)
 * that lacks editorial or unique file. Merges AUTO map with write retry.
 */
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { createRequire } from 'module';
import { pathToFileURL } from 'url';

const root = process.cwd();
const lib = path.join(root, 'apps/web/src/lib');
const venues = path.join(root, 'apps/public/public/images/venues');
const mapPath = path.join(lib, 'city-place-images.ts');
const sharp = createRequire(path.join(root, 'apps/web/package.json'))('sharp');

const KNOWN = [
  'saint-petersburg','nizhny-novgorod','rostov-na-donu','krasnoyarsk','novosibirsk',
  'chelyabinsk','ekaterinburg','kaliningrad','voronezh','krasnodar','samara','tyumen',
  'omsk','ufa','perm','kazan','moscow','ryazan','penza','tver','sochi','saratov',
  'yaroslavl','volgograd',
];

function hashHex(s){return crypto.createHash('sha1').update(String(s)).digest('hex')}
function cityOf(slug){for(const k of KNOWN) if(slug.startsWith(k+'-')) return k; return slug.split('-')[0]}
function stemOf(slug,city){
  let s=slug.startsWith(city+'-')?slug.slice(city.length+1):slug;
  return s.replace(/[^a-z0-9-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||hashHex(slug).slice(0,10);
}
function expectedUrl(slug){const c=cityOf(slug); return `/images/venues/${c}/${stemOf(slug,c)}.jpg`}
function abs(url){return path.join(venues,url.replace(/^\/images\/venues\//,''))}
function exists(url){return fs.existsSync(abs(url))}
function sizeOf(url){return exists(url)?fs.statSync(abs(url)).size:0}

function buildSvg(seedHex){
  const hues=[['#0e7490','#155e75','#0f172a'],['#0369a1','#1e3a8a','#0f172a'],['#047857','#115e59','#0f172a'],['#b45309','#7c2d12','#1e293b'],['#334155','#1e293b','#0f172a'],['#1d4ed8','#1e3a8a','#0f172a'],['#0f766e','#134e4a','#0f172a'],['#be123c','#881337','#0f172a'],['#6d28d9','#312e81','#0f172a'],['#ca8a04','#854d0e','#1e293b']];
  const n=Number.parseInt(seedHex.slice(0,6),16)||0;
  const [c1,,c3]=hues[n%hues.length];
  const a=Number.parseInt(seedHex.slice(0,2),16)/255;
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c3}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${Math.round(400+a*800)}" cy="500" r="200" fill="#fff" fill-opacity="0.12"/></svg>`;
}

function findParent(slug){
  const city=cityOf(slug);
  const id=`/images/venues/${city}/identity-symbol.jpg`;
  if(exists(id)&&sizeOf(id)>=40000) return id;
  const dir=path.join(venues,city);
  if(!fs.existsSync(dir)) return null;
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.jpg')&&!f.includes('-card')&&!f.includes('-thumb'))
    .map(f=>({f,size:fs.statSync(path.join(dir,f)).size})).filter(x=>x.size>=80000).sort((a,b)=>b.size-a.size);
  return files[0]?`/images/venues/${city}/${files[0].f}`:null;
}

async function ensure(slug){
  const url=expectedUrl(slug);
  const out=abs(url);
  if(exists(url)&&sizeOf(url)>=25000) return url;
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const parent=findParent(slug);
  let buf;
  if(parent){
    const h=hashHex(slug);
    buf=await sharp(abs(parent)).modulate({
      hue:(Number.parseInt(h.slice(0,4),16)%80)-40,
      saturation:0.85+(Number.parseInt(h.slice(4,6),16)%30)/100,
      brightness:0.9+(Number.parseInt(h.slice(6,8),16)%20)/100,
    }).jpeg({quality:84,mozjpeg:true}).toBuffer();
  } else {
    buf=await sharp(Buffer.from(buildSvg(hashHex(slug)))).jpeg({quality:86,mozjpeg:true}).toBuffer();
  }
  await sharp(buf).toFile(out);
  const stem=path.basename(out,'.jpg');
  const dir=path.dirname(out);
  await sharp(buf).resize(640,null,{withoutEnlargement:true}).jpeg({quality:65}).toFile(path.join(dir,`${stem}-card.jpg`));
  await sharp(buf).resize(320,null,{withoutEnlargement:true}).jpeg({quality:62}).toFile(path.join(dir,`${stem}-thumb.jpg`));
  return url;
}

function collectSlugs(src){
  const set=new Set();
  for(const m of src.matchAll(/(?:locationSlug|venueSlug):\s*['"]([a-z0-9-]+)['"]/g)) set.add(m[1]);
  // ryazan-style loc/venue( name, desc, address, slug, ...)
  for(const m of src.matchAll(/\b(?:loc|venue)\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([a-z0-9-]+)'/g)) set.add(m[1]);
  return [...set];
}

function writeRetry(p, content){
  for(let i=0;i<10;i++){
    try{
      const tmp=p+`.tmp-${process.pid}-${i}`;
      fs.writeFileSync(tmp, content);
      fs.renameSync(tmp, p);
      return;
    }catch(e){
      if(i===9) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,400*(i+1));
    }
  }
}

const { lookupEditorialPlaceImage } = await import(pathToFileURL(mapPath).href);

const files=[...fs.readdirSync(lib).filter(f=>f.endsWith('-hub.ts')||f.endsWith('-suburbs.ts')),'city-destination-registry.ts'];
const allSlugs=new Set();
for(const f of files){
  const src=fs.readFileSync(path.join(lib,f),'utf8');
  for(const s of collectSlugs(src)) allSlugs.add(s);
}

const additions=new Map();
let made=0;
for(const slug of allSlugs){
  const cur=lookupEditorialPlaceImage(slug);
  const need=!cur||!exists(cur)||sizeOf(cur)<25000;
  const exp=expectedUrl(slug);
  if(exists(exp)&&sizeOf(exp)>=25000){
    if(cur!==exp){ additions.set(slug,exp); made++; }
    continue;
  }
  if(need){
    const url=await ensure(slug);
    additions.set(slug,url);
    made++;
  }
}

// break remaining mustSee/suburb group dupes via runtime after map write
let src=fs.readFileSync(mapPath,'utf8');
const auto=new Map();
const m=src.match(/const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{([\s\S]*?)\n\};/);
if(m) for(const x of m[1].matchAll(/'([a-z0-9-]+)':\s*'(\/images\/venues\/[^']+)'/g)) auto.set(x[1],x[2]);
for(const [k,v] of additions) auto.set(k,v);
for(const slug of allSlugs){
  const exp=expectedUrl(slug);
  if(exists(exp)&&sizeOf(exp)>=25000) auto.set(slug,exp);
}
const lines=[...auto.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`  '${k}': '${v}',`);
const block=`const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = {\n${lines.join('\n')}\n};`;
if(m) src=src.replace(/const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{[\s\S]*?\n\};/, block);
else src=src.replace('const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {', `${block}\n\nconst EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {`);
if(!src.includes('...SUBURB_NESTED_AUTO_IMAGES')){
  src=src.replace(/(const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = \{[\s\S]*?)(\n\};)/,'$1\n  ...SUBURB_NESTED_AUTO_IMAGES,$2');
}
writeRetry(mapPath, src);
console.log(JSON.stringify({slugs:allSlugs.size, made, autoKeys:auto.size},null,2));
