import type { Metadata } from 'next';
import Link from 'next/link';

import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: 'Расчет стоимости',
  description: 'Сложный расчет билетов Дайбилет - появится позже.',
  robots: { index: false, follow: false },
};

/**
 * Scaffold for future complex pricing / internal calc UI (owner 2026-08-07).
 * Simple museum admissions must NOT use this path - they go thin → YooKassa.
 * Wire real calculator here when product needs multi-offer qty / packages / promo.
 */
export default function CheckoutCalcScaffoldPage() {
  return (
    <SiteLayout>
      <section className="container-page py-16">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-400">Скоро</p>
        <h1 className="mt-2 text-3xl font-extrabold text-slate-950 sm:text-4xl">
          Сложный расчет билетов
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
          Этот экран для будущих продуктов с внутренним расчетом цены (несколько тарифов, пакеты,
          промо). Простые входные билеты в музеи оплачиваются напрямую через ЮKassa - без калькулятора.
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex rounded-full bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
        >
          На главную
        </Link>
      </section>
    </SiteLayout>
  );
}
