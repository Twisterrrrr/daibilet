/**
 * Break remaining same-URL clones inside mustSee / suburb groups.
 * Force unique expected path per slug + AUTO override.
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
const { lookupEditorialPlaceImage } = await import(pathToFileURL(mapPath).href);

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

async function forceUnique(slug, parentUrl){
  const url=expectedUrl(slug);
  const out=abs(url);
  fs.mkdirSync(path.dirname(out),{recursive:true});
  const parent = parentUrl && exists(parentUrl) && sizeOf(parentUrl)>=20000 ? parentUrl : null;
  let buf;
  const h=hashHex(slug+'uniq');
  if(parent){
    buf=await sharp(abs(parent)).modulate({
      hue:(Number.parseInt(h.slice(0,4),16)%100)-50,
      saturation:0.8+(Number.parseInt(h.slice(4,6),16)%25)/100,
      brightness:0.88+(Number.parseInt(h.slice(6,8),16)%18)/100,
    }).jpeg({quality:84,mozjpeg:true}).toBuffer();
  } else {
    const svg=`<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><rect width="100%" height="100%" fill="#1e3a8a"/><circle cx="800" cy="600" r="220" fill="#fff" fill-opacity="0.15"/></svg>`;
    buf=await sharp(Buffer.from(svg)).jpeg({quality:86}).toBuffer();
  }
  await sharp(buf).toFile(out);
  const stem=path.basename(out,'.jpg');
  const dir=path.dirname(out);
  await sharp(buf).resize(640,null,{withoutEnlargement:true}).jpeg({quality:65}).toFile(path.join(dir,`${stem}-card.jpg`));
  await sharp(buf).resize(320,null,{withoutEnlargement:true}).jpeg({quality:62}).toFile(path.join(dir,`${stem}-thumb.jpg`));
  return url;
}

function mustSeeSlugs(src, prefix){
  const start=src.search(new RegExp(`export const ${prefix}_MUST_SEE`));
  if(start<0) return [];
  const rest=src.slice(start);
  const endMatch=rest.search(new RegExp(`export const ${prefix}_(SUBURBS|DAY_ROUTE_PRESETS|FAQ|TRAVEL)`));
  const chunk=rest.slice(0,endMatch>0?endMatch:rest.length);
  const set=new Set();
  for(const m of chunk.matchAll(/(?:locationSlug|venueSlug):\s*['"]([^'"]+)['"]/g)) set.add(m[1]);
  for(const m of chunk.matchAll(/\b(?:loc|venue)\(\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'[^']*'\s*,\s*'([a-z0-9-]+)'/g)) set.add(m[1]);
  return [...set];
}

function placesBlocks(src){
  const lines=src.split('\n'); const blocks=[]; let depth=0,inP=false,buf=[],hint='';
  for(let i=0;i<lines.length;i++){
    const line=lines[i];
    if(!inP&&/places:\s*\[/.test(line)){
      for(let j=i;j>=Math.max(0,i-40);j--){const nm=lines[j].match(/name:\s*['"]([^'"]+)['"]/); if(nm){hint=nm[1];break}}
      inP=true; depth=(line.match(/\[/g)||[]).length-(line.match(/\]/g)||[]).length; if(depth<=0) inP=false; continue;
    }
    if(!inP) continue;
    depth+=(line.match(/\[/g)||[]).length; depth-=(line.match(/\]/g)||[]).length; buf.push(line);
    if(depth<=0){
      const slugs=[...buf.join('\n').matchAll(/(?:locationSlug|venueSlug):\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
      blocks.push({suburb:hint,slugs}); buf=[]; inP=false; hint='';
    }
  }
  return blocks;
}

const HUBS={
  'ryazan-hub.ts':'RYAZAN','penza-hub.ts':'PENZA','tver-hub.ts':'TVER',
  'rostov-na-donu-hub.ts':'ROSTOV_NA_DONU','voronezh-hub.ts':'VORONEZH',
  'samara-hub.ts':'SAMARA','kazan-hub.ts':'KAZAN','ekaterinburg-hub.ts':'EKB',
};

const groups=[];
for(const [file,prefix] of Object.entries(HUBS)){
  const src=fs.readFileSync(path.join(lib,file),'utf8');
  groups.push({label:file+':mustSee', slugs:mustSeeSlugs(src,prefix)});
  for(const b of placesBlocks(src)) groups.push({label:file+':'+b.suburb, slugs:b.slugs});
}
for(const f of ['saint-petersburg-suburbs.ts','moscow-suburbs.ts']){
  const src=fs.readFileSync(path.join(lib,f),'utf8');
  for(const b of placesBlocks(src)) groups.push({label:f+':'+b.suburb, slugs:b.slugs});
}

const additions=new Map();
let broken=0;
for(const g of groups){
  const urlTo=new Map();
  const uniqueSlugs=[...new Set(g.slugs)];
  for(const slug of uniqueSlugs){
    const url=lookupEditorialPlaceImage(slug);
    if(!url) continue;
    if(!urlTo.has(url)) urlTo.set(url,[]);
    urlTo.get(url).push(slug);
  }
  for(const [sharedUrl, list] of urlTo){
    if(list.length<2) continue;
    // keep first on sharedUrl; remake rest
    for(let i=1;i<list.length;i++){
      const slug=list[i];
      const url=await forceUnique(slug, sharedUrl);
      additions.set(slug,url);
      broken++;
    }
  }
}

let src=fs.readFileSync(mapPath,'utf8');
const auto=new Map();
const m=src.match(/const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{([\s\S]*?)\n\};/);
if(m) for(const x of m[1].matchAll(/'([a-z0-9-]+)':\s*'(\/images\/venues\/[^']+)'/g)) auto.set(x[1],x[2]);
for(const [k,v] of additions) auto.set(k,v);
const lines=[...auto.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`  '${k}': '${v}',`);
const block=`const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = {\n${lines.join('\n')}\n};`;
src=src.replace(/const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{[\s\S]*?\n\};/, block);
const tmp=mapPath+`.tmp-${process.pid}`;
fs.writeFileSync(tmp,src);
fs.renameSync(tmp,mapPath);
console.log(JSON.stringify({broken, additions:additions.size, autoKeys:auto.size},null,2));
