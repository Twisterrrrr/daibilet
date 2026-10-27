import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { AdmissionCheckoutForm } from '@/components/AdmissionCheckoutForm.client';
import { SiteLayout } from '@/components/SiteLayout';
import {
  admissionTypeBadgeLabel,
  formatAdmissionPriceFrom,
  isOpenDateValidity,
} from '@/lib/finance-projection';
import { fetchAdmissionProductBySlug } from '@/server/finance-projection-client';

type PageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchAdmissionProductBySlug(slug);
  const title = product?.shortTitle || product?.title || 'Оплата билета';
  return {
    title: `${title} - оплата`,
    description: 'Оплата входного билета на Дайбилет через ЮKassa.',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

/**
 * Simple admission / museum path: thin email → YooKassa confirmationUrl.
 * Complex pricing calculator (future) is a separate surface under /checkout/calc.
 */
export default async function AdmissionCheckoutPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await fetchAdmissionProductBySlug(slug);

  if (!product) {
    notFound();
  }

  if (!product.canSell || !product.offers.length) {
    return (
      <SiteLayout>
        <section className="container-page py-16">
          <h1 className="text-3xl font-extrabold text-slate-950">Пока недоступно</h1>
          <p className="mt-3 max-w-xl text-slate-600">
            Этот билет временно нельзя купить на Дайбилет. Загляните позже или выберите другое событие.
          </p>
          <Link href="/" className="mt-6 inline-flex text-sm font-semibold text-primary-700 hover:text-primary-800">
            На главную
          </Link>
        </section>
      </SiteLayout>
    );
  }

  const priceLabel = formatAdmissionPriceFrom(product.priceFromRub);
  const openDate = isOpenDateValidity(product.validityMode);
  const venueHref = product.venue?.slug ? `/venues/${encodeURIComponent(product.venue.slug)}` : null;

  return (
    <SiteLayout>
      <section className="border-b border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-primary-950 text-white">
        <div className="container-page py-10 sm:py-12">
          <div className="flex flex-wrap items-center gap-2 text-sm text-white/70">
            <Link href="/" className="hover:text-white">
              Главная
            </Link>
            <span>/</span>
            {venueHref ? (
              <>
                <Link href={venueHref} className="hover:text-white">
                  {product.venue?.title || 'Площадка'}
                </Link>
                <span>/</span>
              </>
            ) : null}
            <span className="text-white">Оплата</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold text-white/90">
              {admissionTypeBadgeLabel(product.type)}
            </span>
            {openDate ? (
              <span className="rounded-full bg-sky-400/20 px-3 py-1 text-xs font-semibold text-sky-100">
                Открытая дата
              </span>
            ) : null}
            {priceLabel ? (
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/85">
                {priceLabel}
              </span>
            ) : null}
          </div>
          <h1 className="mt-4 max-w-3xl text-3xl font-extrabold tracking-tight sm:text-4xl">
            {product.shortTitle || product.title}
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-7 text-white/80">
            Email для билета - и сразу оплата в ЮKassa.
          </p>
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <AdmissionCheckoutForm product={product} />
      </section>
    </SiteLayout>
  );
}
