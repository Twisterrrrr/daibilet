import Link from 'next/link';
import type { PublicSessionDto } from '@daibilet/contracts/public';

import { formatPriceFrom } from '@/lib/format';
import { eventHref } from '@/lib/routes';

export function EventCard({ session }: { session: PublicSessionDto }) {
  const href = eventHref(session);
  return (
    <article className="card-link">
      <Link href={href} className="block">
        {session.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={session.imageUrl} alt="" className="aspect-[16/10] w-full object-cover" loading="lazy" />
        ) : (
          <div className="aspect-[16/10] w-full bg-slate-100" />
        )}
        <div className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">{session.category}</p>
          <h2 className="mt-1 line-clamp-2 text-base font-bold text-slate-900">{session.title}</h2>
          <p className="mt-2 text-sm text-slate-600">
            {session.city}
            {session.venue ? ` · ${session.venue}` : ''}
          </p>
          <p className="mt-2 text-sm text-slate-500">
            {session.dateLabel}
            {session.timeLabel ? ` · ${session.timeLabel}` : ''}
          </p>
          <p className="mt-3 text-sm font-semibold text-slate-900">{formatPriceFrom(session.priceFrom)}</p>
        </div>
      </Link>
    </article>
  );
}
