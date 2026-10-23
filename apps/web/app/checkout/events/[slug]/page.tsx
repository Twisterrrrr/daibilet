import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { EventCheckoutForm } from '@/components/EventCheckoutForm.client';
import { SiteLayout } from '@/components/SiteLayout';
import { fetchFinanceEventCheckout } from '@/server/finance-event-checkout';

type PageProps = { params: Promise<{ slug: string }> };

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Оплата события — Дайбилет',
  robots: { index: false, follow: false },
};

export default async function EventCheckoutPage({ params }: PageProps) {
  const { slug } = await params;
  const event = await fetchFinanceEventCheckout(slug);
  if (!event) notFound();
  return <SiteLayout>
    <section className="container-page py-10 sm:py-14">
      <Link href="/events" className="text-sm text-primary-700">← К событиям</Link>
      <h1 className="mt-5 text-3xl font-extrabold text-slate-950">{event.title}</h1>
      <p className="mt-2 text-slate-600">Оформление билета через Дайбилет</p>
      <div className="mt-8">
        {event.kind === 'OPEN_DATE' && event.canSell
          ? <EventCheckoutForm event={event} />
          : <div className="rounded-card border border-slate-200 bg-white p-6 text-slate-700">
            Покупка пока недоступна. Проверьте страницу события позже.
          </div>}
      </div>
    </section>
  </SiteLayout>;
}
