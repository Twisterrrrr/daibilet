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
  const title = product?.shortTitle || product?.title || 'Оформление билета';
  return {
    title: `${title} - оплата`,
    description: 'Оформление входного билета на Дайбилет.',
    robots: { index: false, follow: false },
  };
}

export const dynamic = 'force-dynamic';

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
            <span className="text-white">Оформление</span>
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
          {product.shortDescription ? (
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/80">{product.shortDescription}</p>
          ) : (
            <p className="mt-3 max-w-2xl text-base leading-7 text-white/80">
              Укажите email и тариф - мы создадим заказ и направим к оплате, если она доступна.
            </p>
          )}
        </div>
      </section>

      <section className="container-page py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(280px,360px)]">
          <AdmissionCheckoutForm product={product} />
          <aside className="h-fit rounded-2xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-600">
            <h2 className="text-base font-bold text-slate-900">Как проходит оплата</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 leading-6">
              <li>Выбираете тариф и указываете email для билета.</li>
              <li>Мы создаем заказ в платежном контуре Дайбилет.</li>
              <li>Если ЮKassa доступна - откроется страница оплаты; иначе покажем подтверждение тестового заказа.</li>
            </ol>
            <p className="mt-4 leading-6">
              Код заказа пригодится в разделе{' '}
              <Link href="/account/purchases" className="font-semibold text-primary-700 hover:underline">
                Мои покупки
              </Link>
              .
            </p>
          </aside>
        </div>
      </section>
    </SiteLayout>
  );
}
