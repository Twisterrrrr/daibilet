import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { SiteLayout } from '@/components/SiteLayout';
import { SafeImage } from '@/components/SafeImage.client';
import {
  admissionTypeBadgeLabel,
  formatAdmissionPriceFrom,
  isOpenDateValidity,
  resolveAdmissionCheckoutUrl,
} from '@/lib/finance-projection';
import { fetchAdmissionProductBySlug } from '@/server/finance-projection-client';

type PageProps = { params: Promise<{ slug: string }> };

function validityText(product: NonNullable<Awaited<ReturnType<typeof fetchAdmissionProductBySlug>>>) {
  if (isOpenDateValidity(product.validityMode)) {
    if (product.validFrom && product.validTo) {
      return `Открытая дата. Действует с ${formatDate(product.validFrom)} по ${formatDate(product.validTo)}.`;
    }
    if (product.validTo) return `Открытая дата. Действует до ${formatDate(product.validTo)}.`;
    if (product.validDaysAfterPurchase) {
      return `Открытая дата. Билет действует ${product.validDaysAfterPurchase} дней после покупки.`;
    }
    return 'Билет без фиксированной даты посещения.';
  }
  if (product.validDaysAfterPurchase) {
    return `Билет действует ${product.validDaysAfterPurchase} дней после покупки.`;
  }
  if (product.validFrom && product.validTo) {
    return `Действует с ${formatDate(product.validFrom)} по ${formatDate(product.validTo)}.`;
  }
  if (product.validTo) return `Действует до ${formatDate(product.validTo)}.`;
  return 'Информация о сроке действия пока не указана.';
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('ru-RU', { dateStyle: 'long', timeZone: 'Europe/Moscow' }).format(date);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchAdmissionProductBySlug(slug);
  if (!product) return { title: 'Билет не найден', robots: { index: false, follow: false } };

  const title = product.shortTitle || product.title;
  return {
    title: `${title} - билеты на Дайбилет`,
    description: product.shortDescription || `${admissionTypeBadgeLabel(product.type)}. ${product.venue?.title || ''}`,
    alternates: { canonical: `/admissions/${encodeURIComponent(product.slug)}` },
    openGraph: {
      title,
      description: product.shortDescription || `${admissionTypeBadgeLabel(product.type)}. ${product.venue?.title || ''}`,
      ...(product.imageUrl ? { images: [product.imageUrl] } : {}),
    },
  };
}

export const revalidate = 300;
export const dynamicParams = true;

export default async function AdmissionProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchAdmissionProductBySlug(slug);
  if (!product) notFound();

  const title = product.shortTitle || product.title;
  const venueHref = product.venue?.slug ? `/venues/${encodeURIComponent(product.venue.slug)}` : null;
  const checkoutUrl = product.canSell ? resolveAdmissionCheckoutUrl(product.checkoutPath) : null;
  const priceLabel = formatAdmissionPriceFrom(product.priceFromRub);
  const openDate = isOpenDateValidity(product.validityMode);

  return (
    <SiteLayout>
      <main>
        <section className="border-b border-slate-200 bg-white">
          <div className="container-page py-4 text-sm text-slate-500">
            <Link href="/" className="hover:text-slate-900">Главная</Link>
            <span className="mx-2">/</span>
            {venueHref ? (
              <>
                <Link href={venueHref} className="hover:text-slate-900">{product.venue?.title || 'Площадка'}</Link>
                <span className="mx-2">/</span>
              </>
            ) : null}
            <span className="text-slate-800">Билет</span>
          </div>
        </section>

        <section className="container-page grid gap-7 py-6 sm:py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(18rem,0.8fr)] lg:gap-10">
          <div className="min-w-0">
            {product.imageUrl ? (
              <div className="relative mb-6 aspect-[16/10] overflow-hidden rounded-2xl bg-slate-100 sm:rounded-3xl">
                <SafeImage src={product.imageUrl} alt="" fill sizes="(min-width: 1024px) 65vw, 100vw" className="object-cover" />
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                {admissionTypeBadgeLabel(product.type)}
              </span>
              {openDate ? (
                <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-800">Открытая дата</span>
              ) : null}
            </div>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-slate-950 sm:text-4xl">{title}</h1>
            {product.venue ? (
              <p className="mt-3 text-sm text-slate-600 sm:text-base">
                {venueHref ? <Link href={venueHref} className="font-semibold text-primary-700 hover:underline">{product.venue.title}</Link> : product.venue.title}
                {product.city?.title ? ` · ${product.city.title}` : ''}
              </p>
            ) : null}
            {product.shortDescription ? (
              <p className="mt-6 max-w-3xl whitespace-pre-line text-base leading-7 text-slate-700">{product.shortDescription}</p>
            ) : null}
            <section className="mt-7 rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5" aria-labelledby="admission-validity-title">
              <h2 id="admission-validity-title" className="text-sm font-semibold text-slate-900">Условия посещения</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">{validityText(product)}</p>
            </section>
          </div>

          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 lg:sticky lg:top-24">
            <p className="text-sm text-slate-500">Входной билет</p>
            <p className="mt-2 font-display text-2xl font-bold text-slate-950">{priceLabel || 'Цена уточняется'}</p>
            {product.offers.length ? (
              <ul className="mt-4 divide-y divide-slate-100 border-y border-slate-100">
                {product.offers.map((offer) => (
                  <li key={offer.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                    <span className="text-slate-600">{offer.title}</span>
                    <span className="shrink-0 font-semibold text-slate-900">от {new Intl.NumberFormat('ru-RU').format(offer.priceRub)} ₽</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-4 text-sm leading-6 text-slate-600">{validityText(product)}</p>
            {checkoutUrl ? (
              <a href={checkoutUrl} className="mt-5 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-primary-600 px-5 text-base font-semibold text-white transition hover:bg-primary-700">
                Перейти к покупке
              </a>
            ) : (
              <p className="mt-5 rounded-xl bg-slate-100 px-4 py-3 text-center text-sm font-medium text-slate-500">Билет временно недоступен</p>
            )}
            {product.city?.title ? <p className="mt-4 text-center text-xs text-slate-500">{product.city.title}</p> : null}
          </aside>
        </section>
      </main>
    </SiteLayout>
  );
}
