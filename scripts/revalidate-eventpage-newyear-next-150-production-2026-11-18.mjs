import fs from 'node:fs';
import path from 'node:path';

const resultPath=process.argv[2]||path.join(process.cwd(),'data/ticketscloud/editorial/eventpage-newyear-next-150-production-result-2026-11-18.json');
const result=JSON.parse(fs.readFileSync(resultPath,'utf8'));
const secret=String(process.env.DAIBILET_NEXT_REVALIDATE_SECRET||'').trim();
const base=String(process.env.DAIBILET_WEB_REVALIDATE_URL||'http://127.0.0.1:3001').replace(/\/$/u,'');
if(!secret)throw new Error('DAIBILET_NEXT_REVALIDATE_SECRET is required');
if(result.complete!==true||result.pages.length!==222||result.pages.some(page=>!page.isIndexable))throw new Error('Expected 222 applied and indexable EventPage records');

const eventPaths=result.pages.map(page=>`/events/${encodeURIComponent(page.slug)}`);
const cachePaths=[...eventPaths,'/events','/sitemap.xml','/sitemaps/events.xml'];
async function revalidate(paths,skipIndexNow){
 const response=await fetch(`${base}/api/internal/revalidate`,{method:'POST',headers:{'content-type':'application/json',authorization:`Bearer ${secret}`},body:JSON.stringify({paths,skipIndexNow})});
 const body=await response.json().catch(()=>({}));
 if(!response.ok||body.ok!==true)throw new Error(`Revalidation failed (${response.status})`);
 return {status:response.status,pathCount:body.revalidatedPaths?.length??0,indexNowQueued:body.indexNowQueued===true};
}
const cache=await revalidate(cachePaths,true);
const indexNow=await revalidate(eventPaths,false);
process.stdout.write(JSON.stringify({eventPages:result.pages.length,cache,indexNow,sitemapsIncluded:['/sitemap.xml','/sitemaps/events.xml']}));
