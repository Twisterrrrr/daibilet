import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const root=process.cwd(), main=path.resolve(root,'..','..','daibilet');
const dir=path.join(root,'data/ticketscloud/editorial');
const backupPath=path.join(dir,'cirk-bruno-ishim-tobolsk-before-city-h1-fix-2026-11-16.json');
const resultPath=path.join(dir,'cirk-bruno-ishim-tobolsk-fix-result-2026-11-16.json');
const apply=process.argv.includes('--apply'); if(!apply&&!process.argv.includes('--preflight')) throw new Error('Use --preflight or --apply');
const targets=[
 {id:'6d2bbcae-551f-4ec0-949d-544ad683e946',slug:'cirk-bruno-v-g-ishim',h1:'Цирк Бруно в Ишиме'},
 {id:'ccbfe318-3491-4ad3-a602-5ae1fc7b7b87',slug:'cirk-bruno-v-g-tobolsk',h1:'Цирк Бруно в Тобольске'},
];
const body=`### Животные, заявленные в анонсе

В программе цирка «Бруно» заявлены пять животных:
- американский енот
- хорьки
- северные хаски
- белый волк
- зелёная макака

### Цирковые номера и артисты

Помимо животных, организатор перечисляет цирковые номера и участников:
- артисты оригинального жанра
- пластический этюд
- жонглирование
- игра с хлыстами
- эквилибр на катушках
- выступление клоуна

В доступном анонсе не названы артисты и не указан порядок выступлений, поэтому этот список обозначает заявленные части программы, а не последовательность шоу. Гастрольные показы проходят в Оби, Тобольске и Ишиме; сведения о местной площадке и сеансе приведены ниже.`;
const envText=fs.readFileSync(path.join(main,'.env'),'utf8'), raw=envText.match(/^DATABASE_URL=(.*)$/mu)?.[1]?.trim().replace(/^['"]|['"]$/gu,'');
if(!raw) throw new Error('DATABASE_URL missing in main checkout .env');
const u=new URL(raw);u.hostname='127.0.0.1';u.port='5433';u.pathname='/daibilet';if(u.hostname!=='127.0.0.1'||u.port!=='5433'||u.pathname!=='/daibilet')throw new Error('Refusing non-production tunnel target');process.env.DATABASE_URL=u.toString();
const {Pool}=createRequire(path.join(main,'packages/db/package.json'))('pg');const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1});
const db={query:(sql,params)=>pool.query(sql,params),transaction:async(fn)=>{const c=await pool.connect();try{await c.query('BEGIN');const r=await fn({query:(s,p)=>c.query(s,p)});await c.query('COMMIT');return r}catch(e){await c.query('ROLLBACK');throw e}finally{c.release()}}};
const {getAdminEventPage,updateAdminEventPage}=await import(pathToFileURL(path.join(root,'apps/backend/src/event-pages.js')).href);
const stable=v=>v instanceof Date?v.toISOString():Array.isArray(v)?v.map(stable):v&&typeof v==='object'?Object.fromEntries(Object.keys(v).sort().map(k=>[k,stable(v[k])])):v;
const same=(a,b)=>JSON.stringify(stable(a))===JSON.stringify(stable(b));
try{
 const identity=await db.query('SELECT current_database() AS database');if(identity.rows[0].database!=='daibilet')throw new Error('Connected DB is not production daibilet');
 const pages=[];
 for(const target of targets){
  const page=await getAdminEventPage(db,target.id);if(!page||page.slug!==target.slug||page.status!=='READY'||page.isIndexable!==true||!page.publishedAt)throw new Error(`Unexpected published page ${target.slug}`);
  const about=page.content?.sections?.find(s=>s.id==='about');if(!about)throw new Error(`About section missing ${target.slug}`);
  if(target.slug.endsWith('ishim')){if(!about.body.includes('Животные, заявленные в анонсе')||page.content.activeEditorialText?.version!=='2026-11-16-bruno-ishim-list-correction')throw new Error('Ishim list correction was not persisted as expected');}
  else if(!about.body.includes('В анонсе цирка «Бруно» перечислены животные'))throw new Error('Tobolsk original section changed unexpectedly');
  if(!page.content.activeEditorialText||page.content.activeEditorialText.status!=='ACTIVE_EDITORIAL_REWRITE')throw new Error('Active rewrite marker missing');
  if(!page.routes.some(r=>r.path===`/events/${target.slug}`))throw new Error(`Route missing for ${target.slug}`);
  const slots=await db.query(`SELECT count(DISTINCT e.id)::int AS n FROM "EventPageEvent" l JOIN "Event" e ON e.id=l."eventId" WHERE l."eventPageId"=$1 AND EXISTS(SELECT 1 FROM "EventSession" s WHERE s."eventId"=e.id AND s."isActive" AND s."startsAt">now() AND s."archivedAt" IS NULL AND s."cancelledAt" IS NULL) AND EXISTS(SELECT 1 FROM "EventOffer" o WHERE o."eventId"=e.id AND o.active)`,[target.id]);
  if(slots.rows[0].n<1)throw new Error(`No saleable active event for ${target.slug}`);
  pages.push({target,page,activeSaleableEvents:slots.rows[0].n});
 }
 const snapshot={database:identity.rows[0].database,capturedAt:new Date().toISOString(),pages:pages.map(({target,page,activeSaleableEvents})=>({target,activeSaleableEvents,page:{id:page.id,slug:page.slug,title:page.title,summary:page.summary,heroImageUrl:page.heroImageUrl,content:page.content,seoH1:page.seoH1,seoTitle:page.seoTitle,seoDescription:page.seoDescription,canonicalPath:page.canonicalPath,status:page.status,isIndexable:page.isIndexable,publishedAt:page.publishedAt},eventIds:page.events.map(e=>e.eventId).sort(),routes:page.routes.map(r=>({path:r.path,kind:r.kind,source:r.source})).sort((a,b)=>a.path.localeCompare(b.path)),revisionCount:page.revisions.length}))};
 if(!apply){if(fs.existsSync(backupPath))throw new Error('Backup exists; refusing overwrite');fs.writeFileSync(backupPath,JSON.stringify(snapshot,null,2)+'\n');process.stdout.write(JSON.stringify({mode:'preflight',database:snapshot.database,pages:snapshot.pages.map(p=>({id:p.page.id,slug:p.page.slug,status:p.page.status,isIndexable:p.page.isIndexable,activeSaleableEvents:p.activeSaleableEvents,revisionCount:p.revisionCount,seoH1:p.page.seoH1})),backupPath}));}
 else{
  if(!fs.existsSync(backupPath))throw new Error('Preflight backup missing');const before=JSON.parse(fs.readFileSync(backupPath,'utf8'));const beforeById=new Map(before.pages.map(p=>[p.page.id,p]));const updates=[];
  for(const {target,page} of pages){const old=beforeById.get(target.id);if(!old||old.page.slug!==page.slug||!same(old.page.content,page.content)||!same(old.eventIds,page.events.map(e=>e.eventId).sort())||!same(old.routes,page.routes.map(r=>({path:r.path,kind:r.kind,source:r.source})).sort((a,b)=>a.path.localeCompare(b.path))))throw new Error(`Page changed since preflight: ${target.slug}`);
   const content=structuredClone(page.content);content.sections.find(s=>s.id==='about').body=body;content.activeEditorialText.version='2026-11-16-bruno-city-and-program-fix';
   const updated=await updateAdminEventPage(db,target.id,{slug:page.slug,title:page.title,summary:page.summary,heroImageUrl:page.heroImageUrl,content,seoH1:target.h1,seoTitle:page.seoTitle,seoDescription:page.seoDescription,canonicalPath:page.canonicalPath,status:page.status,isIndexable:page.isIndexable,changeNote:'Разнесены по спискам животные и цирковые номера; H1 уточнён по городу показа; URL и связи сохранены'});
   if(!updated||updated.slug!==target.slug||updated.status!=='READY'||updated.isIndexable!==true||updated.seoH1!==target.h1||!updated.publishedAt)throw new Error(`Update verification failed: ${target.slug}`);
   if(updated.content.sections.find(s=>s.id==='about')?.body!==body)throw new Error(`Content verification failed: ${target.slug}`);
   if(!same(old.eventIds,updated.events.map(e=>e.eventId).sort()))throw new Error(`Event links changed: ${target.slug}`);
   if(!same(old.routes,updated.routes.map(r=>({path:r.path,kind:r.kind,source:r.source})).sort((a,b)=>a.path.localeCompare(b.path))))throw new Error(`Routes changed: ${target.slug}`);
   for(const field of ['title','summary','heroImageUrl','seoTitle','seoDescription','canonicalPath','status','isIndexable','publishedAt'])if(!same(old.page[field]??null,updated[field]??null))throw new Error(`${field} changed unexpectedly: ${target.slug}`);
   if(updated.revisions.length!==old.revisionCount+1)throw new Error(`Expected one new revision: ${target.slug}`);
   updates.push({id:target.id,slug:target.slug,url:`https://daibilet.ru/events/${target.slug}`,seoH1:target.h1,status:updated.status,isIndexable:updated.isIndexable,publishedAt:updated.publishedAt,revisionCountBefore:old.revisionCount,revisionCountAfter:updated.revisions.length,eventIdsChanged:false,routesChanged:false,seoFieldsChanged:false});
  }
  const result={appliedAt:new Date().toISOString(),pages:updates,contentUpdated:'about section: animal list separated from circus acts',activeEditorialVersion:'2026-11-16-bruno-city-and-program-fix'};fs.writeFileSync(resultPath,JSON.stringify(result,null,2)+'\n');process.stdout.write(JSON.stringify(result));
 }
}finally{await pool.end();}