import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root=process.cwd();
for(const line of fs.readFileSync(path.join(root,'.env'),'utf8').split(/\r?\n/u)){const t=line.trim();if(!t||t.startsWith('#'))continue;const i=t.indexOf('=');if(i>0)process.env[t.slice(0,i).trim()]=t.slice(i+1).trim().replace(/^['"]|['"]$/gu,'');}
const url=new URL(process.env.DATABASE_URL||'');if(url.pathname.endsWith('/daibilet_baseline')&&process.env.ALLOW_PRODUCTION_SSH_TUNNEL==='1'){url.pathname='/daibilet';url.port='5433';process.env.DATABASE_URL=url.toString();}
const {createDb}=await import(pathToFileURL(path.join(root,'apps/backend/src/db.js')).href);const db=createDb(root);
try{const ids=['evt_6aff048423c2d862dfc660a7'];const q=await db.query(`SELECT e.id,e.slug,page.id AS "pageId",page.slug AS "pageSlug",page.status,page."isIndexable",page."publishedAt",page."canonicalPath" FROM "Event" e LEFT JOIN "EventPageEvent" link ON link."eventId"=e.id LEFT JOIN "EventPage" page ON page.id=link."eventPageId" WHERE e.id=ANY($1::text[]) ORDER BY page."createdAt",page.id`,[ids]);process.stdout.write(JSON.stringify(q.rows,null,2));}finally{await db.close();}
