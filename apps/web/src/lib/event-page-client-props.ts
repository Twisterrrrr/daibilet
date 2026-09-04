import type { PublicEventPageDto } from '@daibilet/contracts/public';

/** Strip non-JSON-safe values before passing event page data to client components. */
export function toEventPageClientPayload(payload: PublicEventPageDto): PublicEventPageDto {
  return JSON.parse(
    JSON.stringify({
      generatedAt: payload.generatedAt,
      event: payload.event,
      sessions: payload.sessions ?? [],
      offers: payload.offers ?? [],
      ticketPrices: payload.ticketPrices ?? [],
      purchaseOptions: payload.purchaseOptions ?? [],
      related: payload.related ?? [],
      landings: payload.landings ?? [],
      stats: payload.stats ?? { sessions: 0 },
    }),
  ) as PublicEventPageDto;
}
