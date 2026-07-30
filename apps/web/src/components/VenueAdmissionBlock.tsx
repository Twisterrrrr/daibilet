import { Ticket } from 'lucide-react';

import { AdmissionProductCard } from '@/components/AdmissionProductCard';
import type { FinanceAdmissionProduct } from '@/lib/finance-projection';

type Props = {
  products: FinanceAdmissionProduct[];
  className?: string;
};

/** Venue page block «Входные билеты» - separate from event programme slots. */
export function VenueAdmissionBlock({ products, className = '' }: Props) {
  if (!products.length) return null;

  return (
    <section
      id="venue-admission"
      className={`rounded-2xl border border-emerald-100 bg-white p-6 ${className}`}
      data-block="venue-admission"
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-full bg-emerald-50 p-2 text-emerald-700">
          <Ticket className="h-4 w-4" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-slate-900">Входные билеты</h2>
          <p className="mt-1 text-sm text-slate-600">
            Билет без сеанса в афише - отдельная покупка на Дайбилет.
          </p>
        </div>
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        {products.map((product) => (
          <AdmissionProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}
