import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mainRepo = path.resolve(root, '..', '..', 'daibilet');
const editorial = path.join(root, 'data/ticketscloud/editorial');
const auditPath = path.join(editorial, 'eventpage-newyear-next-150-expanded-audit-2026-11-18.json');
const backupPath = path.join(editorial, 'eventpage-newyear-next-150-production-before-apply-2026-11-18.json');
const resultPath = path.join(editorial, 'eventpage-newyear-next-150-production-result-2026-11-18.json');
const version = '2026-11-18-eventpage-newyear-next-150';
const apply = process.argv.includes('--apply');
const preflight = process.argv.includes('--preflight');
if (apply === preflight) throw new Error('Use exactly one of --preflight or --apply');

function assert(ok, message) { if (!ok) throw new Error(message); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, stable(value[k])]));
  return value;
}
function equal(a, b) { return JSON.stringify(stable(a)) === JSON.stringify(stable(b)); }
function plainText(value) {
  return String(value ?? '').replace(/<[^>]*>/gu, ' ').replace(/&nbsp;|&#160;/giu, ' ').replace(/&amp;/giu,'&').replace(/&quot;/giu,'"').replace(/&#39;|&apos;/giu,"'").replace(/^\s{0,3}#{1,6}\s+/gmu, '').replace(/^\s*[-*+]\s+/gmu, '').replace(/[*_`>#]/gu, '').replace(/\s+/gu, ' ').trim();
}
function sourceBodyChars(value) {
  const raw=String(value??'').replace(/<br\s*\/?\s*>/giu,'\n').replace(/<\/(?:p|div|li|h[1-6])\s*>/giu,'\n').replace(/<[^>]*>/gu,' ').replace(/&nbsp;|&#160;/giu,' ').replace(/&amp;/giu,'&').replace(/&quot;/giu,'"').replace(/&#39;|&apos;/giu,"'");
  const lines=raw.split(/\r?\n/u);const kept=[];let inTail=false;
  for(const original of lines){const line=original.trim();if(!line)continue;
    if(/^(?:#{1,6}\s*)?(?:практическая информация|ближайшие концерты|контакты организатора)\s*:?\s*$/iu.test(line))inTail=true;
    if(inTail)continue;
    if(/^(?:возрастная категория|возрастное ограничение|продолжительность(?: спектакля)?|адрес|билеты|тайминг|начало|дата|время начала|место сбора|важно|телефон организатора)\s*:/iu.test(line))continue;
    if(/^(?:\d{1,2}\s+(?:ноября|декабря|января|февраля)|\+?7[\s(\d-]{8,})/iu.test(line))continue;
    kept.push(line);
  }
  return plainText(kept.join('\n')).length;
}
function parseSectionFiles() {
  const sections = new Map();
  for (let batch = 1; batch <= 5; batch += 1) {
    const file = path.join(editorial, `eventpage-newyear-next-150-batch-${String(batch).padStart(2,'0')}-rewrites-2026-11-17.md`);
    const markdown = fs.readFileSync(file, 'utf8').replace(/^\uFEFF/u, '');
    const headings = [...markdown.matchAll(/^##\s+(0?\d{1,2})(?:-\d{1,2})?(?:\.|\s+-)\s+([^\r\n]+)\r?\n/gmu)];
    assert(headings.length > 0, `Batch ${batch}: no text sections found`);
    for (let i = 0; i < headings.length; i += 1) {
      const position = Number(headings[i][1]);
      const raw = markdown.slice(headings[i].index + headings[i][0].length, headings[i+1]?.index ?? markdown.length).trim();
      const practical = /^\s*(?:#{1,6}\s*)?(?:\*\*)?Практическая информация(?:\*\*)?\s*:?\s*$/mu.exec(raw);
      const before = practical ? raw.slice(0, practical.index) : raw;
      const bodyLines = before.split(/\r?\n/u).filter(line => !/^\s*(?:\*\*(?:EventPage ID|EventPage|Event ID|Город|Площадка|Связанные страницы|Оригинал|Статус):\*\*|[-*]\s*(?:EventPage ID|EventPage|Event ID|Город|Оригинал):)/iu.test(line));
      const mainBody = bodyLines.join('\n').trim();
      const paragraphs = mainBody.split(/\r?\n\s*\r?\n/u).map(part => part.trim()).filter(part => part && !/^#{1,6}\s/u.test(part) && plainText(part).length > 30);
      sections.set(`B${batch} #${position}`, { batch, position, mainBody, practical: practical ? raw.slice(practical.index + practical[0].length).trim() : '', hasPractical: Boolean(practical), paragraphs: paragraphs.length, chars: plainText(mainBody).length });
    }
  }
  return sections;
}
function loadWorkset() {
  const data = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  assert(data.expandedPageCount === 227 && data.rows.length === 227, 'Expected 227 expanded EventPage rows');
  assert(new Set(data.rows.map(row => row.expandedEventPageId)).size === 227, 'Expanded EventPage IDs are not unique');
  const sections = parseSectionFiles();
  return data.rows.map(row => {
    const section = sections.get(row.effectiveTextSection);
    assert(section, `No text section for ${row.expandedEventPageId}: ${row.effectiveTextSection}`);
    assert(section.hasPractical && section.paragraphs >= 2, `Effective text lacks two paragraphs/practical info for ${row.expandedEventPageId}: ${row.effectiveTextSection}`);
    assert(section.paragraphs >= 2, `Current rewrite has fewer than two substantial paragraphs for ${row.expandedEventPageId}`);
    return { ...row, ...section };
  });
}
function databaseUrl() {
  const envFile = fs.readFileSync(path.join(mainRepo, '.env'), 'utf8');
  const raw = envFile.match(/^DATABASE_URL=(.*)$/mu)?.[1]?.trim().replace(/^['"]|['"]$/gu, '');
  assert(raw, 'DATABASE_URL missing from main checkout .env');
  const url = new URL(raw); url.hostname='127.0.0.1'; url.port='5433'; url.pathname='/daibilet';
  assert(url.hostname==='127.0.0.1' && url.port==='5433' && url.pathname==='/daibilet', 'Refusing non-production target');
  return url.toString();
}
const requireFromDb = createRequire(path.join(mainRepo, 'packages/db/package.json'));
const { Client } = requireFromDb('pg');
const client = new Client({ connectionString: databaseUrl(), connectionTimeoutMillis: 15000, statement_timeout: 45000, query_timeout: 50000, application_name: 'daibilet-eventpage-newyear-150' });
const workset = loadWorkset();
const ids = workset.map(row => row.expandedEventPageId);
const snapshotSql = `
 SELECT p.id,p.slug,p.title,p.summary,p."heroImageUrl",p.content,p."seoH1",p."seoTitle",p."seoDescription",p."canonicalPath",p.status,p."isIndexable",p."publishedAt",p."tourGroupId",
  COALESCE((SELECT jsonb_agg(jsonb_build_object('eventId',l."eventId",'position',l.position,'role',l.role,'sourceSnapshot',l."sourceSnapshot") ORDER BY l.position) FROM "EventPageEvent" l WHERE l."eventPageId"=p.id),'[]'::jsonb) links,
  COALESCE((SELECT jsonb_agg(jsonb_build_object('path',r.path,'kind',r.kind,'source',r.source,'createdAt',r."createdAt") ORDER BY r.path) FROM "EventPageRoute" r WHERE r."eventPageId"=p.id),'[]'::jsonb) routes,
  COALESCE((SELECT jsonb_agg(DISTINCT c.title) FROM "EventPageEvent" l JOIN "Event" e ON e.id=l."eventId" LEFT JOIN "City" c ON c.id=e."primaryCityId" WHERE l."eventPageId"=p.id AND c.title IS NOT NULL),'[]'::jsonb) linked_cities,
  (SELECT count(*)::int FROM "EventPageRevision" v WHERE v."eventPageId"=p.id) revision_count,
  (SELECT count(DISTINCT e.id)::int FROM "EventPageEvent" l JOIN "Event" e ON e.id=l."eventId" WHERE l."eventPageId"=p.id
   AND EXISTS(SELECT 1 FROM "EventOffer" o WHERE o."eventId"=e.id AND o.active IS TRUE)
   AND EXISTS(SELECT 1 FROM "EventSession" s WHERE s."eventId"=e.id AND s."isActive" IS NOT FALSE AND s."archivedAt" IS NULL AND s."cancelledAt" IS NULL AND s."startsAt">=now()
    AND lower(coalesce(s."sourceStatus",'')) NOT IN ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'))) active_event_count
 FROM "EventPage" p WHERE p.id=ANY($1::text[])`;
function pageSnapshot(page) {
  return { id:page.id,slug:page.slug,title:page.title,summary:page.summary,heroImageUrl:page.heroImageUrl,content:page.content,seoH1:page.seoH1,seoTitle:page.seoTitle,seoDescription:page.seoDescription,canonicalPath:page.canonicalPath,status:page.status,isIndexable:page.isIndexable,publishedAt:page.publishedAt,tourGroupId:page.tourGroupId,links:page.links,routes:page.routes,linkedCities:page.linked_cities,revisionCount:page.revision_count,activeEventCount:page.active_event_count };
}
function revisionContent(page) {
  return { slug:page.slug,title:page.title,summary:page.summary,heroImageUrl:page.heroImageUrl,content:page.content,seoH1:page.seoH1,seoTitle:page.seoTitle,seoDescription:page.seoDescription,canonicalPath:page.canonicalPath };
}
function isActiveEditorial(page) { return page.content?.activeEditorialText?.status === 'ACTIVE_EDITORIAL_REWRITE'; }

try {
 await client.connect();
 const identity=(await client.query('SELECT current_database() database,now() checked_at')).rows[0];
 assert(identity.database==='daibilet','Connected database is not production daibilet');
 const baseline=Number((await client.query(`SELECT count(*)::int count FROM "EventPage" WHERE status='READY' AND "isIndexable" IS TRUE AND "publishedAt" IS NOT NULL`)).rows[0].count);
 const response=await client.query(snapshotSql,[ids]);
 const liveById=new Map(response.rows.map(page=>[page.id,page]));
 assert(liveById.size===227,`Found ${liveById.size}/227 pages`);
 const issues=[]; const inactive=[]; const ready=[]; const backupPages=[]; const sourceShortfalls=[];
 for (const item of workset) {
  const page=liveById.get(item.expandedEventPageId);
  assert(page && page.slug,`Missing EventPage ${item.expandedEventPageId}`);
  assert((page.routes||[]).some(route=>route.path===`/events/${page.slug}`),`Current route missing: ${page.slug}`);
  assert(page.linked_cities.length===1 && page.linked_cities[0]===item.city,`City relation mismatch for ${page.slug}: ${JSON.stringify(page.linked_cities)} vs ${item.city}`);
  assert(page.title.toLocaleLowerCase('ru')===item.title.toLocaleLowerCase('ru'),`Title mismatch for ${page.slug}: ${page.title} vs ${item.title}`);
  assert(page.status==='DRAFT' && page.isIndexable===false && page.publishedAt===null,`Page is not an unpublished draft: ${page.slug}`);
  assert(!isActiveEditorial(page),`Existing active editorial rewrite on ${page.slug}`);
  const populated=(page.content?.sections||[]).some(section=>String(section.body||'').trim()||(section.items||[]).length);
  assert(!populated,`Existing non-empty EventPage sections would be replaced: ${page.slug}`);
  const record=pageSnapshot(page);
  backupPages.push(record);
  if (page.active_event_count>0) {
   const linkedSourceChars=(page.links||[]).map(link=>sourceBodyChars(link.sourceSnapshot?.description)).filter(chars=>chars>0);
   const maxSourceBodyChars=linkedSourceChars.length?Math.max(...linkedSourceChars):0;
   if(maxSourceBodyChars>item.chars)sourceShortfalls.push({eventPageId:page.id,slug:page.slug,textSection:item.effectiveTextSection,rewriteChars:item.chars,maxLinkedSourceBodyChars:maxSourceBodyChars,linkedSourceDescriptions:linkedSourceChars.length});
   item.maxLinkedSourceBodyChars=maxSourceBodyChars;
   ready.push({item,page});
  } else inactive.push({eventPageId:page.id,slug:page.slug,title:page.title,city:item.city,reason:'no future saleable session with active offer at production preflight'});
 }
 assert(ready.length===222,`Expected 222 active pages, got ${ready.length}`);
 if(sourceShortfalls.length){process.stdout.write(JSON.stringify({sourceLengthShortfalls:sourceShortfalls.length,items:sourceShortfalls},null,2));throw new Error('Rewrite shorter than meaningful linked source text; expand before production preflight');}
 if(preflight) {
  assert(!fs.existsSync(backupPath),`Backup already exists: ${path.basename(backupPath)}`);
  assert(!fs.existsSync(resultPath),`Result already exists: ${path.basename(resultPath)}`);
  const backup={capturedAt:identity.checked_at,database:identity.database,indexableEventPagesBefore:baseline,expectedExpandedPages:227,eligibleActivePages:ready.length,inactivePages:inactive,pages:backupPages};
  fs.writeFileSync(backupPath,`${JSON.stringify(backup,null,2)}\n`,'utf8');
  process.stdout.write(JSON.stringify({mode:'preflight',database:identity.database,checkedAt:identity.checked_at,expandedPages:227,activeEligible:ready.length,inactive:inactive.length,indexableEventPagesBefore:baseline,backup:path.basename(backupPath),inactivePages:inactive},null,2));
 } else {
  assert(fs.existsSync(backupPath),'Production preflight backup missing; run --preflight first');
  const backup=JSON.parse(fs.readFileSync(backupPath,'utf8'));
  assert(backup.database==='daibilet'&&backup.pages.length===227&&backup.eligibleActivePages===222,'Invalid production backup');
  const backupById=new Map(backup.pages.map(page=>[page.id,page]));
  assert(Number((await client.query(`SELECT count(*)::int count FROM "EventPage" WHERE status='READY' AND "isIndexable" IS TRUE AND "publishedAt" IS NOT NULL`)).rows[0].count)>=backup.indexableEventPagesBefore,'Indexable baseline unexpectedly fell');
  let checkpoint={startedAt:backup.capturedAt,appliedAt:null,complete:false,database:'daibilet',pages:[],skippedInactive:inactive,counts:{planned:222,applied:0,indexable:0}};
  if(fs.existsSync(resultPath)) { checkpoint=JSON.parse(fs.readFileSync(resultPath,'utf8'));assert(checkpoint.database==='daibilet'&&Array.isArray(checkpoint.pages),'Invalid prior result checkpoint'); }
  const done=new Map(checkpoint.pages.map(page=>[page.eventPageId,page]));
  for(let i=0;i<ready.length;i++) {
   const {item}=ready[i]; const id=item.expandedEventPageId; const slugPage=liveById.get(id); const prior=backupById.get(id); const existing=done.get(id);
   await client.query('BEGIN');
   try {
    const locked=(await client.query('SELECT * FROM "EventPage" WHERE id=$1 FOR UPDATE NOWAIT',[id])).rows[0];
    assert(locked&&locked.slug===slugPage.slug,`Page identity changed: ${slugPage.slug}`);
    const content=locked.content&&typeof locked.content==='object'?locked.content:{};
    const bodySection={id:'about',kind:'about',title:'О событии',body:item.mainBody,items:[]};
    const expectedContent={...content,sections:[bodySection],activeEditorialText:{field:'sections',status:'ACTIVE_EDITORIAL_REWRITE',version}};
    const doneAlready=locked.status==='READY'&&locked.isIndexable===true&&locked.publishedAt&&content.activeEditorialText?.version===version&&equal(content.sections,[bodySection]);
    if(doneAlready) { await client.query('COMMIT'); if(!existing) done.set(id,{eventPageId:id,slug:locked.slug,title:locked.title,city:item.city,batch:item.effectiveTextSection.split(' ')[0],status:'READY',isIndexable:true,publishedAt:locked.publishedAt,revisionsAfter:prior.revisionCount+2,linksRoutesSeoChanged:false,usedDynamicPracticalInfo:true}); continue; }
    assert(locked.status==='DRAFT'&&locked.isIndexable===false&&locked.publishedAt===null&&!isActiveEditorial(locked),`Refusing to overwrite non-draft or active page: ${slugPage.slug}`);
    assert(equal(locked.content,prior.content)&&equal(locked.title,prior.title)&&equal(locked.summary,prior.summary)&&equal(locked.heroImageUrl,prior.heroImageUrl)&&equal(locked.links,prior.links)&&equal(locked.routes,prior.routes)&&equal(locked.seoH1,prior.seoH1)&&equal(locked.seoTitle,prior.seoTitle)&&equal(locked.seoDescription,prior.seoDescription)&&equal(locked.canonicalPath,prior.canonicalPath),`Production changed since preflight: ${slugPage.slug}`);
    assert((await client.query(`SELECT count(*)::int count FROM "EventPageEvent" l JOIN "Event" e ON e.id=l."eventId" WHERE l."eventPageId"=$1 AND EXISTS(SELECT 1 FROM "EventOffer" o WHERE o."eventId"=e.id AND o.active IS TRUE) AND EXISTS(SELECT 1 FROM "EventSession" s WHERE s."eventId"=e.id AND s."isActive" IS NOT FALSE AND s."archivedAt" IS NULL AND s."cancelledAt" IS NULL AND s."startsAt">=now() AND lower(coalesce(s."sourceStatus",'')) NOT IN ('widget_blocked','paused','suspended','stopped','cancelled','canceled','draft','hidden','stand_by','closed','sales_closed','sale_closed','not_for_sale'))`,[id])).rows[0].count>0,`No active sale remains at apply time: ${slugPage.slug}`);
    const updated=await client.query(`UPDATE "EventPage" SET content=$2::jsonb,status='READY',"isIndexable"=true,"publishedAt"=COALESCE("publishedAt",now()),"updatedAt"=now() WHERE id=$1 RETURNING *`,[id,JSON.stringify(expectedContent)]);
    const after=updated.rows[0];
    const sourceSnapshot={links:prior.links,routes:prior.routes,tourGroupId:prior.tourGroupId};
    const revisionSnapshot=revisionContent(after);
    let versionNo=Number((await client.query('SELECT COALESCE(MAX(version),0)+1 AS version FROM "EventPageRevision" WHERE "eventPageId"=$1',[id])).rows[0].version);
    for(const note of [`Редакторский рерайт новогоднего пакета из 150 текстов; опубликован и открыт к индексации (${version})`,'Публикация редакционного EventPage']) {
     await client.query(`INSERT INTO "EventPageRevision" (id,"eventPageId",version,content,"sourceSnapshot","changeNote","createdBy") VALUES ($1,$2,$3,$4::jsonb,$5::jsonb,$6,NULL)`,[randomUUID(),id,versionNo++,JSON.stringify(revisionSnapshot),JSON.stringify(sourceSnapshot),note]);
    }
    await client.query('COMMIT');
    const result={eventPageId:id,slug:after.slug,title:after.title,city:item.city,effectiveTextSection:item.effectiveTextSection,contentMode:item.contentMode,status:'READY',isIndexable:true,publishedAt:after.publishedAt,eventIds:prior.links.map(link=>link.eventId),routes:prior.routes.map(route=>route.path),revisionsBefore:prior.revisionCount,revisionsAfter:prior.revisionCount+2,linksRoutesSeoChanged:false,usedDynamicPracticalInfo:true};
    done.set(id,result);
    checkpoint={...checkpoint,appliedAt:new Date().toISOString(),complete:false,pages:[...done.values()],counts:{planned:222,applied:done.size,indexable:done.size}};
    fs.writeFileSync(resultPath,`${JSON.stringify(checkpoint,null,2)}\n`,'utf8');
    process.stdout.write(`Published ${done.size}/222: ${after.slug}\n`);
   } catch(error) { await client.query('ROLLBACK');throw error; }
  }
  const targetIds=ready.map(({item})=>item.expandedEventPageId);
  const verify=await client.query(`SELECT id,slug,status,"isIndexable","publishedAt",content FROM "EventPage" WHERE id=ANY($1::text[])`,[targetIds]);
  assert(verify.rows.length===222&&verify.rows.every(page=>page.status==='READY'&&page.isIndexable===true&&page.publishedAt&&page.content?.activeEditorialText?.version===version),`Final EventPage read-back failed: ${verify.rows.filter(page=>page.status!=='READY'||page.isIndexable!==true||!page.publishedAt||page.content?.activeEditorialText?.version!==version).length} mismatches`);
  const globalAfter=Number((await client.query(`SELECT count(*)::int count FROM "EventPage" WHERE status='READY' AND "isIndexable" IS TRUE AND "publishedAt" IS NOT NULL`)).rows[0].count);
  checkpoint={...checkpoint,appliedAt:new Date().toISOString(),completedAt:new Date().toISOString(),complete:true,pages:[...done.values()],skippedInactive:inactive,counts:{planned:222,applied:222,indexable:222,indexableEventPagesBefore:backup.indexableEventPagesBefore,indexableEventPagesAfter:globalAfter},linksRoutesSeoFieldsChanged:false,staticPracticalInfoCopied:false,practicalInfoRendering:'Generated per Event DTO on each page as a list'};
  fs.writeFileSync(resultPath,`${JSON.stringify(checkpoint,null,2)}\n`,'utf8');
  process.stdout.write(JSON.stringify({complete:true,...checkpoint.counts,skippedInactive:inactive.length},null,2));
 }
} finally { await client.end(); }

