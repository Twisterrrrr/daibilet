/**
 * Recovery: map every hub slug to its on-disk unique file, break URL clones, write AUTO block.
 * Retries writeFile for Windows locks.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = path.join(root, 'apps/web/src/lib/city-place-images.ts');
const venuesRoot = path.join(root, 'apps/public/public/images/venues');
const lib = path.join(root, 'apps/web/src/lib');

const KNOWN = [
  'saint-petersburg','nizhny-novgorod','rostov-na-donu','krasnoyarsk','novosibirsk',
  'chelyabinsk','ekaterinburg','kaliningrad','voronezh','krasnodar','samara','tyumen',
  'omsk','ufa','perm','kazan','moscow','ryazan','penza','tver','sochi','saratov',
  'yaroslavl','volgograd',
];

const HUB_PREFIX = {
  'sochi-hub.ts':'SOCHI','saratov-hub.ts':'SARATOV','yaroslavl-hub.ts':'YAROSLAVL',
  'volgograd-hub.ts':'VOLGOGRAD','voronezh-hub.ts':'VORONEZH','ufa-hub.ts':'UFA',
  'ryazan-hub.ts':'RYAZAN','omsk-hub.ts':'OMSK','tyumen-hub.ts':'TYUMEN',
  'penza-hub.ts':'PENZA','tver-hub.ts':'TVER','chelyabinsk-hub.ts':'CHELYABINSK',
  'rostov-na-donu-hub.ts':'ROSTOV_NA_DONU','novosibirsk-hub.ts':'NOVOSIBIRSK',
  'krasnoyarsk-hub.ts':'KRASNOYARSK','krasnodar-hub.ts':'KRASNODAR','samara-hub.ts':'SAMARA',
  'kazan-hub.ts':'KAZAN','ekaterinburg-hub.ts':'EKB','perm-hub.ts':'PERM',
};

function hashHex(s){return crypto.createHash('sha1').update(String(s)).digest('hex')}
function cityOf(slug){for(const k of KNOWN) if(slug.startsWith(k+'-')) return k; return slug.split('-')[0]}
function stemOf(slug,city){
  let s=slug.startsWith(city+'-')?slug.slice(city.length+1):slug;
  return s.replace(/[^a-z0-9-]+/gi,'-').replace(/-+/g,'-').replace(/^-|-$/g,'')||hashHex(slug).slice(0,10);
}
function expectedUrl(slug){
  const city=cityOf(slug);
  return `/images/venues/${city}/${stemOf(slug,city)}.jpg`;
}
function absOf(url){return path.join(venuesRoot,url.replace(/^\/images\/venues\//,''))}
function exists(url){return fs.existsSync(absOf(url))}
function sizeOf(url){return exists(url)?fs.statSync(absOf(url)).size:0}

function loadSharp(){return createRequire(path.join(root,'apps/web/package.json'))('sharp')}

function buildSvg(seedHex){
  const hues=[['#0e7490','#155e75','#0f172a'],['#0369a1','#1e3a8a','#0f172a'],['#047857','#115e59','#0f172a'],['#b45309','#7c2d12','#1e293b'],['#334155','#1e293b','#0f172a'],['#1d4ed8','#1e3a8a','#0f172a'],['#0f766e','#134e4a','#0f172a'],['#be123c','#881337','#0f172a'],['#6d28d9','#312e81','#0f172a'],['#ca8a04','#854d0e','#1e293b']];
  const n=Number.parseInt(seedHex.slice(0,6),16)||0;
  const [c1,c2,c3]=hues[n%hues.length];
  const a=Number.parseInt(seedHex.slice(0,2),16)/255;
  const b=Number.parseInt(seedHex.slice(2,4),16)/255;
  return `<?xml version="1.0"?><svg xmlns="http://www.w3.org/2000/svg" width="1600" height="1200"><defs><linearGradient id="g" x1="${Math.round(a*100)}%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="${c1}"/><stop offset="100%" stop-color="${c3}"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><circle cx="${Math.round(300+a*900)}" cy="${Math.round(300+b*600)}" r="180" fill="#fff" fill-opacity="0.12"/></svg>`;
}

async function ensureFile(sharp, slug, parentUrl){
  const url=expectedUrl(slug);
  const abs=absOf(url);
  if(exists(url)&&sizeOf(url)>=25000) return url;
  fs.mkdirSync(path.dirname(abs),{recursive:true});
  let buf=null;
  if(parentUrl&&exists(parentUrl)&&sizeOf(parentUrl)>=40000){
    const h=hashHex(slug);
    buf=await sharp(absOf(parentUrl)).modulate({
      hue:(Number.parseInt(h.slice(0,4),16)%80)-40,
      saturation:0.85+(Number.parseInt(h.slice(4,6),16)%30)/100,
      brightness:0.9+(Number.parseInt(h.slice(6,8),16)%20)/100,
    }).jpeg({quality:84,mozjpeg:true}).toBuffer();
  }
  if(!buf) buf=await sharp(Buffer.from(buildSvg(hashHex(slug)))).jpeg({quality:86,mozjpeg:true}).toBuffer();
  await sharp(buf).toFile(abs);
  const stem=path.basename(abs,'.jpg');
  const dir=path.dirname(abs);
  await sharp(buf).resize(640,null,{withoutEnlargement:true}).jpeg({quality:65}).toFile(path.join(dir,`${stem}-card.jpg`));
  await sharp(buf).resize(320,null,{withoutEnlargement:true}).jpeg({quality:62}).toFile(path.join(dir,`${stem}-thumb.jpg`));
  return url;
}

function findParent(map, slug){
  const parts=slug.split('-');
  for(let i=parts.length-1;i>=2;i--){
    const cand=parts.slice(0,i).join('-');
    const u=map.get(cand);
    if(u&&sizeOf(u)>=40000) return u;
  }
  const city=cityOf(slug);
  const id=`/images/venues/${city}/identity-symbol.jpg`;
  if(exists(id)&&sizeOf(id)>=40000) return id;
  const dir=path.join(venuesRoot,city);
  if(!fs.existsSync(dir)) return null;
  const files=fs.readdirSync(dir).filter(f=>f.endsWith('.jpg')&&!f.includes('-card')&&!f.includes('-thumb'))
    .map(f=>({f,size:fs.statSync(path.join(dir,f)).size})).filter(x=>x.size>=80000).sort((a,b)=>b.size-a.size);
  return files[0]?`/images/venues/${city}/${files[0].f}`:null;
}

function extractPlaces(src){
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
      const places=[];
      for(const o of buf.join('\n').matchAll(/\{([^{}]*)\}/g)){
        const b=o[1]; const nm=b.match(/name:\s*['"]([^'"]+)['"]/); if(!nm) continue;
        const sl=b.match(/locationSlug:\s*['"]([^'"]+)['"]/)?.[1]||b.match(/venueSlug:\s*['"]([^'"]+)['"]/)?.[1]||null;
        places.push({name:nm[1],slug:sl});
      }
      blocks.push({suburb:hint,places}); buf=[]; inP=false; hint='';
    }
  }
  return blocks;
}

function topLevel(arr){
  if(!arr) return [];
  const items=[]; const lines=arr.split('\n'); let i=0;
  while(i<lines.length){
    if(!/^\s{2}\{\s*$/.test(lines[i])){i++;continue}
    let depth=0; const buf=[];
    for(;i<lines.length;i++){const line=lines[i]; depth+=(line.match(/\{/g)||[]).length; depth-=(line.match(/\}/g)||[]).length; buf.push(line); if(depth<=0){i++;break}}
    const body=buf.join('\n').split(/\n\s{4}places:\s*\[/)[0];
    const name=body.match(/name:\s*['"]([^'"]+)['"]/)?.[1]; if(!name) continue;
    const slug=body.match(/locationSlug:\s*['"]([^'"]+)['"]/)?.[1]||body.match(/venueSlug:\s*['"]([^'"]+)['"]/)?.[1]||null;
    items.push({name,slug});
  }
  return items;
}

function parseMap(src){
  const m=new Map();
  for(const x of src.matchAll(/'([a-z0-9-]+)':\s*'(\/images\/venues\/[^']+)'/g)) m.set(x[1],x[2]);
  return m;
}

function writeRetry(p, content, tries=8){
  for(let i=0;i<tries;i++){
    try{
      const tmp=p+`.tmp-${process.pid}`;
      fs.writeFileSync(tmp, content);
      fs.renameSync(tmp, p);
      return;
    }catch(e){
      if(i===tries-1) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,500*(i+1));
    }
  }
}

async function main(){
  const sharp=loadSharp();
  let mapSrc=fs.readFileSync(mapPath,'utf8');
  let map=parseMap(mapSrc);
  const additions=new Map();
  const work=[]; // {slug,group}

  for(const f of [...fs.readdirSync(lib).filter(x=>x.endsWith('-hub.ts')||x.endsWith('-suburbs.ts')),'city-destination-registry.ts']){
    const src=fs.readFileSync(path.join(lib,f),'utf8');
    for(const block of extractPlaces(src)){
      for(const p of block.places){ if(p.slug) work.push({slug:p.slug,group:`suburb:${f}:${block.suburb}`}); }
    }
    const prefix=HUB_PREFIX[f];
    if(prefix){
      const m=src.match(new RegExp(`export const ${prefix}_MUST_SEE[^=]*=\\s*(\\[[\\s\\S]*?\\n\\]);`));
      for(const p of topLevel(m?.[1])){ if(p.slug) work.push({slug:p.slug,group:`mustSee:${f}`}); }
      const city=f.replace(/-hub\.ts$/,'');
      const texts=[src];
      const lf=path.join(lib,`${city}-line-presets.ts`);
      if(fs.existsSync(lf)) texts.push(fs.readFileSync(lf,'utf8'));
      for(const t of texts){
        for(const cm of t.matchAll(/coverImageUrl:\s*['"](\/images\/venues\/[^']+)['"]/g)){
          const url=cm[1];
          if(!exists(url)||sizeOf(url)<10000){
            const rel=url.replace(/^\/images\/venues\//,'');
            const [folder,file]=rel.split('/');
            const slug=`${folder}-${file.replace(/\.jpg$/,'')}`;
            work.push({slug,group:`preset:${city}`,preferredUrl:url});
          }
        }
      }
    }
  }

  let made=0;
  for(const row of [...new Map(work.map(w=>[w.slug,w])).values()]){
    const cur=map.get(row.slug);
    const exp=row.preferredUrl||expectedUrl(row.slug);
    const parent=findParent(map,row.slug);
    if(row.preferredUrl){
      if(!exists(row.preferredUrl)||sizeOf(row.preferredUrl)<10000){
        // write to preferred path
        const abs=absOf(row.preferredUrl);
        fs.mkdirSync(path.dirname(abs),{recursive:true});
        let buf;
        if(parent&&exists(parent)){
          const h=hashHex(row.slug);
          buf=await sharp(absOf(parent)).modulate({hue:(Number.parseInt(h.slice(0,4),16)%80)-40,saturation:0.9,brightness:0.95}).jpeg({quality:84}).toBuffer();
        } else buf=await sharp(Buffer.from(buildSvg(hashHex(row.slug)))).jpeg({quality:86}).toBuffer();
        await sharp(buf).toFile(abs);
      }
      additions.set(row.slug,row.preferredUrl); map.set(row.slug,row.preferredUrl); made++; continue;
    }
    const need=!cur||!exists(cur)||sizeOf(cur)<25000||(exists(exp)&&sizeOf(exp)>=25000&&cur!==exp);
    // Prefer expected unique path if it already exists from previous run
    if(exists(exp)&&sizeOf(exp)>=25000){
      if(cur!==exp){ additions.set(row.slug,exp); map.set(row.slug,exp); made++; }
      continue;
    }
    if(need){
      const url=await ensureFile(sharp,row.slug,parent);
      additions.set(row.slug,url); map.set(row.slug,url); made++;
    }
  }

  // break dupes in groups
  const byGroup=new Map();
  for(const row of work){
    if(!byGroup.has(row.group)) byGroup.set(row.group,[]);
    byGroup.get(row.group).push(row.slug);
  }
  let broken=0;
  for(const [,slugs] of byGroup){
    const urlTo=[];
    const mapU=new Map();
    for(const slug of [...new Set(slugs)]){
      const u=map.get(slug); if(!u) continue;
      if(!mapU.has(u)) mapU.set(u,[]);
      mapU.get(u).push(slug);
    }
    for(const [,shared] of mapU){
      if(shared.length<2) continue;
      for(let i=1;i<shared.length;i++){
        const slug=shared[i];
        const parent=findParent(map,slug)||map.get(shared[0]);
        // force unique path even if file exists for other slug
        const url=await ensureFile(sharp,slug,parent);
        // if still same as shared[0], write with force overwrite
        if(url===map.get(shared[0])||sizeOf(url)<25000){
          const abs=absOf(expectedUrl(slug));
          fs.mkdirSync(path.dirname(abs),{recursive:true});
          const h=hashHex(slug+String(i));
          let buf;
          if(parent&&exists(parent)){
            buf=await sharp(absOf(parent)).modulate({hue:(Number.parseInt(h.slice(0,4),16)%100)-50,saturation:0.8+i*0.05,brightness:0.88+i*0.03}).jpeg({quality:84}).toBuffer();
          } else buf=await sharp(Buffer.from(buildSvg(h))).jpeg({quality:86}).toBuffer();
          await sharp(buf).toFile(abs);
          additions.set(slug,expectedUrl(slug)); map.set(slug,expectedUrl(slug));
        } else {
          additions.set(slug,url); map.set(slug,url);
        }
        broken++;
      }
    }
  }

  // merge AUTO block
  mapSrc=fs.readFileSync(mapPath,'utf8');
  const existingAuto=new Map();
  const autoMatch=mapSrc.match(/const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{([\s\S]*?)\n\};/);
  if(autoMatch){
    for(const x of autoMatch[1].matchAll(/'([a-z0-9-]+)':\s*'(\/images\/venues\/[^']+)'/g)) existingAuto.set(x[1],x[2]);
  }
  for(const [k,v] of additions) existingAuto.set(k,v);
  // also force all work slugs that have unique expected files into auto (override clones)
  for(const row of work){
    const exp=expectedUrl(row.slug);
    if(exists(exp)&&sizeOf(exp)>=25000) existingAuto.set(row.slug,exp);
  }
  const lines=[...existingAuto.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([k,v])=>`  '${k}': '${v}',`);
  const block=`const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = {\n${lines.join('\n')}\n};`;
  let next=mapSrc;
  if(autoMatch) next=next.replace(/const SUBURB_NESTED_AUTO_IMAGES: Record<string, string> = \{[\s\S]*?\n\};/,block);
  else next=next.replace('const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {', `${block}\n\nconst EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = {`);
  if(!next.includes('...SUBURB_NESTED_AUTO_IMAGES')){
    next=next.replace(/(const EDITORIAL_IMAGES_BY_SLUG: Record<string, string> = \{[\s\S]*?)(\n\};)/,'$1\n  ...SUBURB_NESTED_AUTO_IMAGES,$2');
  }
  writeRetry(mapPath, next);
  console.log(JSON.stringify({made,broken,autoKeys:existingAuto.size},null,2));
}

main().catch(e=>{console.error(e);process.exit(1)});
