import { Landmark } from 'lucide-react';

import { AdmissionProductCard } from '@/components/AdmissionProductCard';
import type { FinanceAdmissionListResult } from '@/lib/finance-projection';
import { formatAdmissionPriceFrom } from '@/lib/finance-projection';

type Props = {
  admission: FinanceAdmissionListResult;
  cityName: string;
  editorial?: boolean;
  nested?: boolean;
};

/** City hub museums/admission block - gated by published projection count. */
export function CityAdmissionBlock({
  admission,
  cityName,
  editorial = false,
  nested = false,
}: Props) {
  if (!admission.items.length) return null;

  const priceLabel = formatAdmissionPriceFrom(admission.summary.priceFromRub);
  const headingClass = editorial
    ? 'font-serif text-2xl font-semibold text-zinc-950 sm:text-3xl'
    : 'text-2xl font-bold text-slate-950';

  return (
    <section
      id="admission"
      className={`container-page py-10 ${nested ? '' : 'border-b border-slate-100'}`}
      data-block="city-admission"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="mt-1 rounded-full bg-emerald-50 p-2 text-emerald-700">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h2 className={headingClass}>Музеи и арт-галереи</h2>
            <p className={`mt-1 text-sm ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
              Входные билеты без сеанса в афише
              {cityName ? ` - ${cityName}` : ''}.
              {priceLabel ? ` Цены ${priceLabel}.` : ''}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {admission.items.slice(0, 9).map((product) => (
          <AdmissionProductCard key={product.id} product={product} showVenue />
        ))}
      </div>
    </section>
  );
}
