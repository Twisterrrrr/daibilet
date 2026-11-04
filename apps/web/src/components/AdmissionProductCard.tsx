import {
  admissionTypeBadgeLabel,
  formatAdmissionPriceFrom,
  isOpenDateValidity,
  resolveAdmissionCheckoutUrl,
  shouldShowAdmissionCta,
  type FinanceAdmissionProduct,
} from '@/lib/finance-projection';

type Props = {
  product: FinanceAdmissionProduct;
  /** Show venue link (city hub cards). */
  showVenue?: boolean;
  className?: string;
};

/**
 * Separate admission card - not an event slot. CTA only when canSell.
 */
export function AdmissionProductCard({ product, showVenue = false, className = '' }: Props) {
  const priceLabel = formatAdmissionPriceFrom(product.priceFromRub);
  const openDate = isOpenDateValidity(product.validityMode);
  const showCta = shouldShowAdmissionCta(product);
  const checkoutUrl = showCta
    ? resolveAdmissionCheckoutUrl(product.checkoutPath)
    : null;
  const title = product.shortTitle || product.title;
  const venueSlug = product.venue?.slug;
  const venueHrefPath = venueSlug ? `/venues/${encodeURIComponent(venueSlug)}` : null;

  return (
    <article
      className={`flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}
      data-admission-slug={product.slug}
    >
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          {admissionTypeBadgeLabel(product.type)}
        </span>
        {openDate ? (
          <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-800">
            Открытая дата
          </span>
        ) : null}
        {priceLabel ? (
          <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            {priceLabel}
          </span>
        ) : null}
      </div>

      <h3 className="mt-3 text-lg font-bold text-slate-950">{title}</h3>
      {product.shortDescription ? (
        <p className="mt-2 text-sm leading-6 text-slate-600">{product.shortDescription}</p>
      ) : null}

      {showVenue && product.venue ? (
        <p className="mt-2 text-sm text-slate-500">
          {venueHrefPath ? (
            <a href={venueHrefPath} className="font-medium text-primary-700 hover:underline">
              {product.venue.title}
            </a>
          ) : (
            product.venue.title
          )}
          {product.city?.title ? ` · ${product.city.title}` : null}
        </p>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <div className="text-sm font-semibold text-slate-900">
          {priceLabel || 'Цена уточняется'}
        </div>
        {checkoutUrl ? (
          <a
            href={checkoutUrl}
            className="inline-flex min-h-10 items-center justify-center rounded-full bg-primary-600 px-4 text-sm font-semibold text-white hover:bg-primary-700"
            {...(/^https?:\/\//i.test(checkoutUrl) ? { rel: 'noopener noreferrer' } : {})}
          >
            Оформить
          </a>
        ) : (
          <span className="text-xs font-medium text-slate-400">Скоро в продаже</span>
        )}
      </div>
    </article>
  );
}
