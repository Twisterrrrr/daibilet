import { disconnectPrisma, prisma } from '../src/client.ts';

const counts = await Promise.all([
  prisma.event.count(),
  prisma.eventSession.count(),
  prisma.eventOffer.count(),
  prisma.venue.count(),
  prisma.city.count(),
  prisma.landing.count(),
  prisma.externalOrder.count(),
  prisma.externalTicket.count(),
]);

const [
  events,
  sessions,
  offers,
  venues,
  cities,
  landings,
  externalOrders,
  externalTickets,
] = counts;

console.log(JSON.stringify({
  events,
  sessions,
  offers,
  venues,
  cities,
  landings,
  externalOrders,
  externalTickets,
}, null, 2));

await disconnectPrisma();
