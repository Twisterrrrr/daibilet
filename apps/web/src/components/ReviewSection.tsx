'use client';

import { AlertCircle, CheckCircle, ChevronDown, Send, Star } from 'lucide-react';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';

type RatingSummary = {
  avgRating: number;
  reviewCount: number;
  verifiedCount: number;
  displayedRating: number;
  distribution: Record<number, number>;
};

type ReviewItem = {
  id: string;
  rating: number;
  title?: string | null;
  text: string;
  authorName: string;
  isVerified: boolean;
  createdAt: string;
};

function StarRating({
  value,
  size = 'md',
  interactive = false,
  onChange,
}: {
  value: number;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onChange?: (v: number) => void;
}) {
  const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-7 w-7' };
  const cls = sizes[size];
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = i < Math.round(value);
        return (
          <button
            key={i}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(i + 1)}
            className={interactive ? 'cursor-pointer transition-transform hover:scale-110' : 'cursor-default'}
          >
            <Star className={`${cls} ${filled ? 'fill-amber-400 text-amber-400' : 'fill-slate-200 text-slate-200'}`} />
          </button>
        );
      })}
    </div>
  );
}

function pluralReviews(n: number): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return 'отзыв';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return 'отзыва';
  return 'отзывов';
}

function ReviewForm({
  eventId,
  prefillEmail,
  prefillName,
  reviewRequestToken,
  orderOrTicketRef,
  onSuccess,
}: {
  eventId: string;
  prefillEmail?: string;
  prefillName?: string;
  reviewRequestToken?: string;
  orderOrTicketRef?: string;
  onSuccess: () => void;
}) {
  const formStartedAt = useRef(Date.now());
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [authorName, setAuthorName] = useState(prefillName || '');
  const [authorEmail, setAuthorEmail] = useState(prefillEmail || '');
  const [orderRef, setOrderRef] = useState(orderOrTicketRef || '');
  const [honeypot, setHoneypot] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (rating === 0) {
      setError('Поставьте оценку');
      return;
    }
    if (text.trim().length < 10) {
      setError('Отзыв слишком короткий (мин. 10 символов)');
      return;
    }
    if (!authorName.trim()) {
      setError('Укажите ваше имя');
      return;
    }
    if (!authorEmail.includes('@')) {
      setError('Укажите корректный email');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          eventId,
          rating,
          text: text.trim(),
          authorName: authorName.trim(),
          authorEmail: authorEmail.trim(),
          orderOrTicketRef: orderRef.trim() || undefined,
          website: honeypot || undefined,
          formStartedAt: formStartedAt.current,
          reviewRequestToken: reviewRequestToken || undefined,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(result.message || result.error || `HTTP ${response.status}`);
      }
      setSuccessMessage(typeof result.message === 'string' ? result.message : 'Спасибо за отзыв!');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (successMessage) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-center">
        <CheckCircle className="mx-auto h-10 w-10 text-emerald-500" />
        <p className="mt-3 text-sm font-medium text-emerald-800">{successMessage}</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative space-y-4 rounded-2xl border border-slate-200 bg-white p-6">
      <h3 className="text-base font-bold text-slate-900">Оставить отзыв</h3>
      <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
        <input tabIndex={-1} autoComplete="off" value={honeypot} onChange={(e) => setHoneypot(e.target.value)} />
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium text-slate-500">Ваша оценка *</label>
        <StarRating value={rating} size="lg" interactive onChange={setRating} />
      </div>
      <textarea
        placeholder="Расскажите о вашем опыте… *"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
        maxLength={5000}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">ФИО *</label>
          <input
            type="text"
            value={authorName}
            onChange={(e) => setAuthorName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            maxLength={120}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Email * (не публикуется)</label>
          <input
            type="email"
            value={authorEmail}
            onChange={(e) => setAuthorEmail(e.target.value)}
            readOnly={!!prefillEmail}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm read-only:bg-slate-50 focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
          />
        </div>
      </div>
      {!reviewRequestToken ? (
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Номер заказа / билета (для бейджа «Покупка подтверждена»)</label>
          <input
            type="text"
            value={orderRef}
            onChange={(e) => setOrderRef(e.target.value)}
            placeholder="Из письма или личного кабинета"
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
            maxLength={120}
          />
        </div>
      ) : null}
      {error ? (
        <div className="flex items-center gap-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}
      <button
        type="submit"
        disabled={submitting}
        className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-sm font-medium text-white transition hover:bg-primary-700 disabled:opacity-50"
      >
        <Send className="h-4 w-4" />
        {submitting ? 'Отправляем…' : 'Отправить отзыв'}
      </button>
    </form>
  );
}

export function ReviewSection({
  eventId,
  eventSlug,
  prefillEmail,
  prefillName,
  reviewRequestToken,
  orderOrTicketRef,
  forceFormOpen = false,
}: {
  eventId: string;
  eventSlug: string;
  prefillEmail?: string;
  prefillName?: string;
  reviewRequestToken?: string;
  orderOrTicketRef?: string;
  forceFormOpen?: boolean;
}) {
  const [data, setData] = useState<{
    items: ReviewItem[];
    total: number;
    page: number;
    totalPages: number;
    summary: RatingSummary;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(Boolean(forceFormOpen || reviewRequestToken || orderOrTicketRef));

  const loadReviews = useCallback(
    async (page = 1) => {
      try {
        const key = eventSlug || eventId;
        const res = await fetch(`/api/reviews/events/${encodeURIComponent(key)}?page=${page}&limit=10`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const json = await res.json();
        setData((prev) =>
          page > 1 && prev
            ? {
                ...json,
                items: [...prev.items, ...json.items],
              }
            : json,
        );
      } catch {
        // no-op — form still works by eventId
      } finally {
        setLoading(false);
      }
    },
    [eventSlug, eventId],
  );

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    if (forceFormOpen || reviewRequestToken || orderOrTicketRef) setShowForm(true);
  }, [forceFormOpen, reviewRequestToken, orderOrTicketRef]);

  if (loading) {
    return (
      <section className="py-8" id="reviews">
        <div className="h-40 animate-pulse rounded-2xl bg-slate-100" />
      </section>
    );
  }

  const summary = data?.summary || {
    avgRating: 0,
    reviewCount: 0,
    verifiedCount: 0,
    displayedRating: 0,
    distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
  };
  const reviews = data?.items || [];
  const display = summary.displayedRating || summary.avgRating;

  return (
    <section className="space-y-6" id="reviews">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">
          Отзывы{' '}
          {summary.reviewCount > 0 ? (
            <span className="font-normal text-slate-400">({summary.reviewCount})</span>
          ) : null}
        </h2>
        <button
          type="button"
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl border border-primary-200 bg-primary-50 px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary-100"
        >
          {showForm ? 'Скрыть форму' : 'Написать отзыв'}
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:gap-8 sm:p-6">
        <div className="flex flex-col items-center">
          <span className="text-4xl font-bold text-slate-900">{display > 0 ? display.toFixed(1) : '—'}</span>
          <StarRating value={display} size="sm" />
          <p className="mt-1 text-xs text-slate-500">
            {summary.reviewCount >= 10
              ? `${summary.reviewCount} ${pluralReviews(summary.reviewCount)}`
              : summary.reviewCount > 0
                ? `${summary.reviewCount} ${pluralReviews(summary.reviewCount)} · рейтинг ориентировочный`
                : 'Рейтинг появится после отзывов'}
          </p>
        </div>
        <div className="flex-1 space-y-1.5">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = summary.distribution[star] || 0;
            const maxBar = Math.max(...Object.values(summary.distribution), 1);
            const width = (count / maxBar) * 100;
            return (
              <div key={star} className="flex items-center gap-2 text-sm">
                <span className="w-4 text-right text-slate-500">{star}</span>
                <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                  <div className="absolute inset-y-0 left-0 rounded-full bg-amber-400" style={{ width: `${width}%` }} />
                </div>
                <span className="w-6 text-xs text-slate-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showForm ? (
        <ReviewForm
          eventId={eventId}
          prefillEmail={prefillEmail}
          prefillName={prefillName}
          reviewRequestToken={reviewRequestToken}
          orderOrTicketRef={orderOrTicketRef}
          onSuccess={() => {
            if (!reviewRequestToken) setShowForm(false);
            void loadReviews();
          }}
        />
      ) : null}

      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <article key={review.id} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-900">{review.authorName}</span>
                    {review.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                        <CheckCircle className="h-3 w-3" />
                        Покупка подтверждена
                      </span>
                    ) : null}
                  </div>
                  <p className="text-xs text-slate-400">
                    {new Date(review.createdAt).toLocaleDateString('ru-RU', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <StarRating value={review.rating} size="sm" />
              </div>
              {review.title ? <p className="mt-3 text-sm font-semibold text-slate-800">{review.title}</p> : null}
              <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.text}</p>
            </article>
          ))}
          {data && data.page < data.totalPages ? (
            <button
              type="button"
              onClick={() => void loadReviews(data.page + 1)}
              className="mx-auto flex items-center gap-2 text-sm font-medium text-primary-600 hover:text-primary-700"
            >
              <ChevronDown className="h-4 w-4" />
              Показать ещё
            </button>
          ) : null}
        </div>
      ) : !showForm ? (
        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-8 text-center">
          <p className="text-sm text-slate-500">Пока нет отзывов. Будьте первым!</p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-3 text-sm font-medium text-primary-600 hover:text-primary-700"
          >
            Написать отзыв
          </button>
          <p className="mt-2 text-xs text-slate-400">
            Или из{' '}
            <Link href="/account/purchases" className="underline">
              личного кабинета
            </Link>
          </p>
        </div>
      ) : null}
    </section>
  );
}
