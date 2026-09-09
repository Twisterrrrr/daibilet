export type AdmissionOfferFormValue = {
  key: string;
  title: string;
  priceRub: string;
  oldPriceRub: string;
  capacityTotal: string;
  active: boolean;
};

let fallbackKey = 0;

function createKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  fallbackKey += 1;
  return `offer-${fallbackKey}`;
}

export function createAdmissionOfferFormValue(
  input: Partial<Omit<AdmissionOfferFormValue, 'key'>> = {},
): AdmissionOfferFormValue {
  return {
    key: createKey(),
    title: input.title ?? 'Взрослый',
    priceRub: input.priceRub ?? '500',
    oldPriceRub: input.oldPriceRub ?? '',
    capacityTotal: input.capacityTotal ?? '',
    active: input.active ?? true,
  };
}

export function admissionOffersToPayload(offers: AdmissionOfferFormValue[]) {
  return offers.map((offer) => ({
    title: offer.title.trim() || 'Билет',
    priceRub: Number(offer.priceRub || 0),
    oldPriceRub: offer.oldPriceRub ? Number(offer.oldPriceRub) : null,
    capacityTotal: offer.capacityTotal ? Number(offer.capacityTotal) : null,
    groupSize: 1,
    active: offer.active,
  }));
}
