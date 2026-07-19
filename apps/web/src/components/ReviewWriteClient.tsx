'use client';

import { Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

import { ReviewSection } from '@/components/ReviewSection';
import { SiteLayout } from '@/components/SiteLayout';

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
        if (eventSlug) {
          const res = await fetch(`/api/reviews/events/${encodeURIComponent(eventSlug)}?page=1&limit=1`);
          if (!res.ok) throw new Error('Событие не найдено');
          const payload = await res.json();
          setEventData({
            eventId: payload.eventId,
            eventSlug: payload.eventSlug || eventSlug,
            eventTitle: searchParams.get('eventTitle') || 'событие',
            email: searchParams.get('email') || '',
            buyerName: searchParams.get('name'),
            purchaseRef: orderRef || null,
            token: '',
          });
          return;
        }
        if (eventId && eventSlug) {
          setEventData({
            eventId,
            eventSlug,
            eventTitle: searchParams.get('eventTitle') || 'событие',
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
        <p className="mt-2 text-sm text-slate-500">Попробуйте оставить отзыв на странице мероприятия.</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-6 py-3 text-sm font-medium text-white hover:bg-primary-700"
        >
          На главную
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
      />
    </div>
  );
}

export default function ReviewWriteClient() {
  return (
    <SiteLayout>
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        }
      >
        <ReviewWriteContent />
      </Suspense>
    </SiteLayout>
  );
}
