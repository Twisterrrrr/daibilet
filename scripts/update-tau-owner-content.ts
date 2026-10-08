import { mkdirSync, writeFileSync } from 'node:fs';
import { prisma, disconnectPrisma } from '../packages/db/src/client.ts';

const slug = 'saint-moscow-halloween-6ab8cd78b4327ec3eee2c1ff';
const shortDescription = 'Хэллоуин-вечеринка в TAU на Рязанском проспекте. Начало 31 октября в 23:30.';
const description = `<p>Хэллоуин-вечеринка в TAU на Рязанском проспекте. Начало 31 октября в 23:30.</p>
<p>В программе - диджеи и МС, живые выступления артистов. Line up: Leon, Lima, Krisis, MC Kreeki.</p>
<p>На площадке работают браслеты знакомств, фотозона, зона тематического грима и интерактивы. Из еды - сахарная вата. Действует фейсконтроль и дресс-код, костюм обязателен. Возрастное ограничение - 18+.</p>
<p>Диджеи и МС<br>Выступление артистов<br>Браслеты знакомств<br>Сахарная вата<br>Фотозона<br>Зона тематического грима<br>Тематические интерактивы</p>
<p>Leon<br>Lima<br>Krisis<br>MC Kreeki</p>`;
const venueData = {
  shortDescription: 'Концертная площадка на Рязанском проспекте: вечеринки, диджеи, живые выступления',
  description: 'TAU — площадка на Рязанском проспекте в Москве. Используется под вечеринки, концерты и клубные события: диджеи, живые выступления, тематические программы.\n\nФормат — закрытый зал с несколькими категориями билетов, от входного до ложи. На мероприятиях работает фейсконтроль и дресс-код.\n\nАдрес: Рязанский проспект, 8а, стр. 10. Ближайшее метро — «Стахановская». Телефон площадки: +7 (495) 156-23-66.',
  descriptionOverridden: true,
  hookFact: 'Площадка с шестью категориями билетов — от входного до ложи',
  wayToFind: 'TAU — Рязанский проспект, 8а, стр. 10. Ближайшее метро «Стахановская», далее пешком. Телефон площадки: +7 (495) 156-23-66.',
  address: 'Рязанский проспект, 8а, стр. 10',
  metroStation: 'Стахановская',
  phone: '+7 (495) 156-23-66',
};
async function main() {
try {
  const event = await prisma.event.findUniqueOrThrow({ where: { slug }, include: { override: true, sessions: true } });
  const venue = await prisma.venue.findUniqueOrThrow({ where: { id: 'venue_6752b7bedaddd3870c3a4a53' } });
  if (venue.title !== 'TAU' || event.venueId !== venue.id) throw new Error('Unexpected TAU/event linkage');
  console.log(JSON.stringify({ eventId: event.id, venueId: venue.id, linkedVenueId: event.venueId, sessions: event.sessions.map(s => ({ startsAt: s.startsAt, priceFromRub: s.priceFromRub })) }));
  if (process.argv.includes('--apply')) {
    mkdirSync('var/content-backups', { recursive: true });
    writeFileSync(`var/content-backups/tau-${Date.now()}.json`, JSON.stringify({ event, venue }, null, 2), { mode: 0o600 });
    await prisma.$transaction([
      prisma.eventOverride.upsert({ where: { eventId: event.id }, create: { eventId: event.id, title: 'Хэллоуин-вечеринка в TAU, Москва', seoH1: 'Хэллоуин-вечеринка в TAU, Москва', description, shortDescription }, update: { title: 'Хэллоуин-вечеринка в TAU, Москва', seoH1: 'Хэллоуин-вечеринка в TAU, Москва', description, shortDescription } }),
      prisma.event.update({ where: { id: event.id }, data: { ageLimit: '18+' } }),
      prisma.venue.update({ where: { id: venue.id }, data: venueData }),
    ]);
    const backend = await fetch('http://127.0.0.1:4000/api/internal/public-cache', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.DAIBILET_NEXT_REVALIDATE_SECRET || ''}` }, body: JSON.stringify({ reason: 'owner TAU content update', warm: 'none' }) });
    if (!backend.ok) throw new Error(`Backend cache invalidation failed: ${backend.status}`);
    const response = await fetch('http://127.0.0.1:3001/api/internal/revalidate', { method: 'POST', headers: { 'content-type': 'application/json', 'x-revalidate-secret': process.env.DAIBILET_NEXT_REVALIDATE_SECRET || '' }, body: JSON.stringify({ slug, paths: ['/venues/tau', `/api/public/events/${slug}`, '/api/public/venues/tau'] }) });
    console.log(`content_applied; revalidation=${response.status}`);
    if (!response.ok) throw new Error('Revalidation failed');
  }
} finally { await disconnectPrisma(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
