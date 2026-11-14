/**
 * Venue PDP primary CTA priority (production-parity, Wave 1).
 *
 * LC admission → live playbill → editorial.tickets (official URL) → #visit.
 * Never invent a buy button without a real target.
 */

export type VenueCtaKind = 'admission' | 'program' | 'editorial_tickets' | 'visit';

export type VenueEditorialTicketsCta = {
  href: string;
  /** Optional - omit when public «от» is unknown; UI still shows official-site CTA. */
  priceFromRub?: number;
  badge?: string;
};

export type VenuePrimaryCta = {
  kind: VenueCtaKind;
  href: string;
  label: string;
  /** External official ticket URL (editorial). */
  external?: boolean;
  priceFromRub?: number;
  badge?: string;
};

export type ResolveVenuePrimaryCtaInput = {
  hasAdmission: boolean;
  hasProgram: boolean;
  editorialTickets?: VenueEditorialTicketsCta | null;
  /** Hours / visit tips anchor exists. */
  hasVisitAnchor?: boolean;
  admissionLabel: string;
  programLabel: string;
  /** Default: «Как посетить». */
  visitLabel?: string;
  /** Override playbill / routes anchor (pier → #location-routes, park → #venue-stop-events). */
  programHref?: string;
};

function normalizeEditorialTickets(
  tickets: VenueEditorialTicketsCta | null | undefined,
): VenueEditorialTicketsCta | null {
  const href = String(tickets?.href || '').trim();
  if (!href) return null;
  const price =
    typeof tickets?.priceFromRub === 'number' &&
    Number.isFinite(tickets.priceFromRub) &&
    tickets.priceFromRub > 0
      ? tickets.priceFromRub
      : undefined;
  return {
    href,
    ...(price != null ? { priceFromRub: price } : {}),
    ...(tickets?.badge ? { badge: tickets.badge } : {}),
  };
}

/**
 * Resolve the single primary CTA for hero / sticky cashier.
 * Returns null only when nothing actionable exists (no tickets, no program, no visit).
 */
export function resolveVenuePrimaryCta(
  input: ResolveVenuePrimaryCtaInput,
): VenuePrimaryCta | null {
  if (input.hasAdmission) {
    return {
      kind: 'admission',
      href: '#venue-admission',
      label: input.admissionLabel,
    };
  }

  if (input.hasProgram) {
    return {
      kind: 'program',
      href: input.programHref || '#venue-program',
      label: input.programLabel,
    };
  }

  const tickets = normalizeEditorialTickets(input.editorialTickets);
  if (tickets) {
    return {
      kind: 'editorial_tickets',
      href: tickets.href,
      label: input.admissionLabel,
      external: true,
      ...(tickets.priceFromRub != null ? { priceFromRub: tickets.priceFromRub } : {}),
      badge: tickets.badge,
    };
  }

  if (input.hasVisitAnchor) {
    return {
      kind: 'visit',
      href: '#visit',
      label: input.visitLabel || 'Как посетить',
    };
  }

  return null;
}

/** True when commercial center (#center) has at least one real block to render. */
export function hasVenueCommercialCenter(input: {
  hasAdmission: boolean;
  hasProgram: boolean;
  /** Editorial tickets shown only when no LC inventory and no live program. */
  showEditorialTickets: boolean;
}): boolean {
  return input.hasAdmission || input.hasProgram || input.showEditorialTickets;
}
