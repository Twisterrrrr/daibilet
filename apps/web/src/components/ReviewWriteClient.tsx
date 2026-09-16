'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ReviewSection } from '@/components/ReviewSection';

type RequestInfo = {
  eventId: string;
  eventSlug: string;
  eventTitle: string;
  email: string;
  buyerName?: string | null;
  purchaseDate?: string | null;
  purchaseRef?: string | null;
  token: string;
};

function ReviewWriteContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const eventId = searchParams.get('eventId');
  const eventSlug = searchParams.get('eventSlug');
  const orderRef = searchParams.get('orderRef') || undefined;

  const [eventData, setEventData] = useState<RequestInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      try {
        if (token) {
          const res = await fetch(`/api/reviews/request-info?token=${encodeURIComponent(token)}`);
          if (!res.ok) throw new Error('Ссылка недействительна или истекла');
          const data = (await res.json()) as RequestInfo;
          setEventData(data);
          return;
        }

        const lookupKey = eventSlug || eventId;
        if (lookupKey) {
          let resolvedId = eventId || '';
          let resolvedSlug = eventSlug || '';
          let resolvedTitle = searchParams.get('eventTitle') || 'событие';

          try {
            const res = await fetch(`/api/reviews/events/${encodeURIComponent(lookupKey)}?page=1&limit=1`);
            if (res.ok) {
              const payload = await res.json();
              resolvedId = payload.eventId || resolvedId;
              resolvedSlug = payload.eventSlug || resolvedSlug || lookupKey;
              if (payload.eventTitle) resolvedTitle = payload.eventTitle;
            }
          } catch {
            // Public card may be gone — still allow review by eventId/orderRef.
          }

          if (!resolvedId && eventId) resolvedId = eventId;
          if (!resolvedId && !resolvedSlug) {
            throw new Error('Событие не найдено');
          }

          // Form needs eventId for POST /api/reviews. If API resolve failed but query has eventId, proceed.
          if (!resolvedId) {
            throw new Error('Событие не найдено. Откройте отзыв из личного кабинета или письма.');
          }

          setEventData({
            eventId: resolvedId,
            eventSlug: resolvedSlug || resolvedId,
            eventTitle: resolvedTitle,
            email: searchParams.get('email') || '',
            buyerName: searchParams.get('name'),
            purchaseRef: orderRef || null,
            token: '',
          });
          return;
        }

        setError('Ссылка недействительна');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка загрузки');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token, eventId, eventSlug, orderRef, searchParams]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
      </div>
    );
  }

  if (error || !eventData) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-lg font-medium text-slate-900">{error || 'Ссылка недействительна'}</p>
        <p className="mt-2 text-sm text-slate-500">Попробуйте оставить отзыв из раздела «Мои покупки» — форма работает даже без публичной страницы события.</p>
        <Link
          href="/account/purchases"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700"
        >
          Мои покупки
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 text-center">
        <h1 className="text-2xl font-bold text-slate-900">Как вам {eventData.eventTitle}?</h1>
        <p className="mt-2 text-sm text-slate-500">
          {eventData.purchaseDate
            ? `Посещение: ${new Date(eventData.purchaseDate).toLocaleDateString('ru-RU')}`
            : 'Ваш отзыв поможет другим выбрать событие'}
        </p>
      </div>
      <ReviewSection
        eventId={eventData.eventId}
        eventSlug={eventData.eventSlug}
        prefillEmail={eventData.email || undefined}
        prefillName={eventData.buyerName || undefined}
        reviewRequestToken={token || undefined}
        orderOrTicketRef={eventData.purchaseRef || orderRef}
        forceFormOpen
      />
    </div>
  );
}

export default function ReviewWriteClient() {
  return <ReviewWriteContent />;
}
