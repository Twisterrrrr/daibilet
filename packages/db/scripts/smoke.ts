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
  prisma.providerLink.count(),
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
  providerLinks,
] = counts;

const providerLinksByKindRows = await prisma.providerLink.groupBy({
  by: ['entityKind'],
  _count: { _all: true },
  orderBy: { entityKind: 'asc' },
});

const providerLinksByKind = Object.fromEntries(
  providerLinksByKindRows.map((row) => [row.entityKind, row._count._all]),
);

console.log(JSON.stringify({
  events,
  sessions,
  offers,
  venues,
  cities,
  landings,
  externalOrders,
  externalTickets,
  providerLinks,
  providerLinksByKind,
}, null, 2));

await disconnectPrisma();
