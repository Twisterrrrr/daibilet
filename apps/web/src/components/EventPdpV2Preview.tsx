import Link from 'next/link';
import { Star } from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { V2Trust } from '@/components/V2Trust';
import { fontUnbounded } from '@/lib/fonts';
import type { PublicEventPageDto } from '@daibilet/contracts/public';

const rub = (n?: number | null) => (n ? `${n.toLocaleString('ru-RU')} ₽` : null);

export function EventPdpV2Preview({ page }: { page: PublicEventPageDto }) {
  const event = page.event;
  const sessions = page.sessions ?? [];
  const gallery = page.pdp?.content?.gallery?.length ? page.pdp.content.gallery : null;
  const mainImage = gallery?.[0]?.url || event.imageUrl;
  const thumbs = gallery?.slice(0, 4) ?? [];
  const related = (page.related ?? []).slice(0, 4);
  const reviews = page.reviews ?? [];
  const program = page.program ?? [];
  const faq = page.faq ?? [];
  const price = event.priceFrom ?? page.stats?.priceFrom ?? null;
  const ctaUrl = sessions[0]?.purchaseUrl || event.purchaseUrl || null;

  return (
    <div className={`v2 ${fontUnbounded.variable}`}>
      <div className="container">
        <nav className="breadcrumbs">
          <Link href="/">Главная</Link> / <Link href="/events">Афиша</Link> / <span>{event.title}</span>
        </nav>
      </div>

      <section className="hero">
        <div className="container">
          <div className="hero__grid">
            <div className="gallery">
              <div className="gallery__main">
                <span className="gallery__badge">{event.category}</span>
                {mainImage ? <SafeImage src={mainImage} alt="" fill sizes="60vw" className="object-cover" /> : null}
              </div>
              {thumbs.length ? (
                <div className="gallery__thumbs">
                  {thumbs.map((t, i) => (
                    <div key={i} className={`gallery__thumb ${i === 0 ? 'is-active' : ''}`}>
                      {t.url ? <SafeImage src={t.url} alt="" fill sizes="120px" className="object-cover" /> : null}
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="hero__info">
              {page.rating?.value ? (
                <a href="#reviews" className="rating-inline">
                  <Star className="h-4 w-4 fill-current" aria-hidden />
                  {page.rating.value} <span>· {page.rating.count} отзывов</span>
                </a>
              ) : null}
              <h1>{event.title}</h1>
              <div className="hero__meta">
                {sessions[0] ? <div className="hero__meta-item"><span>{sessions[0].dateLabel}</span></div> : null}
                {event.venue ? <div className="hero__meta-item"><span>{event.venue}{event.venueAddress ? `, ${event.venueAddress}` : ''}</span></div> : null}
                {event.ageLimit ? <div className="hero__meta-item"><span>{event.ageLimit}</span></div> : null}
              </div>
              {event.description ? <p className="hero__desc">{event.description}</p> : null}
              <div><Link href={ctaUrl || '#'} className="btn btn--primary btn--lg">Выбрать места</Link></div>
            </div>
          </div>
        </div>
      </section>

      <div className="main">
        <div className="container">
          <div className="main__grid">
            <div className="content">
              {program.length ? (
                <section>
                  <h2>Программа вечера</h2>
                  <ul className="program">
                    {program.map((it, i) => (
                      <li key={i}>
                        <span className="program__time">{it.timeLabel}</span>
                        <div className="program__body">
                          <strong>{it.title}</strong>
                          {it.description ? <span>{it.description}</span> : null}
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}

              <section>
                <h2>Что важно знать</h2>
                <div className="info-grid">
                  {event.venue ? <div className="info-card"><div><strong>Площадка</strong><span>{event.venue}</span></div></div> : null}
                  {event.ageLimit ? <div className="info-card"><div><strong>Возраст</strong><span>{event.ageLimit}</span></div></div> : null}
                  <div className="info-card"><div><strong>Билет</strong><span>Электронный билет · QR-код на входе</span></div></div>
                  {price ? <div className="info-card"><div><strong>Цена</strong><span>{rub(price)}</span></div></div> : null}
                </div>
              </section>

              {reviews.length ? (
                <section id="reviews">
                  <h2>Отзывы {page.rating ? <span style={{ color: 'var(--muted)', fontFamily: 'var(--font-inter)', fontSize: 16, fontWeight: 500 }}>· {page.rating.count}</span> : null}</h2>
                  {reviews.map((r) => (
                    <div key={r.id} className="review">
                      <div className="review__head">
                        <div className="review__avatar">{r.authorName?.[0] ?? '?'}</div>
                        <div className="review__meta">
                          <strong>{r.authorName}</strong>
                          {r.createdAt ? <small>{new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(r.createdAt))}</small> : null}
                        </div>
                        <div className="review__stars">{'★'.repeat(Math.min(5, Math.max(1, Math.round(r.rating))))}</div>
                      </div>
                      <p className="review__text">{r.text}</p>
                    </div>
                  ))}
                </section>
              ) : null}

              {faq.length ? (
                <section>
                  <h2>Частые вопросы</h2>
                  {faq.map((it, i) => (
                    <details key={i} className="faq-item">
                      <summary className="faq-q">{it.q}</summary>
                      <p className="faq-a">{it.a}</p>
                    </details>
                  ))}
                </section>
              ) : null}

              {related.length ? (
                <section className="related">
                  <h2>Ещё в городе</h2>
                  <div className="related__grid">
                    {related.map((r) => (
                      <Link key={r.id} href={`/events/${r.eventPageSlug || r.slug || ''}`} className="related-card">
                        <div className="related-card__media">
                          {r.imageUrl ? <SafeImage src={r.imageUrl} alt="" fill sizes="16rem" className="object-cover" /> : null}
                        </div>
                        <div className="related-card__body">
                          <div className="related-card__date">{r.dateLabel}</div>
                          <div className="related-card__title">{r.title}</div>
                          {r.priceFrom ? <div className="related-card__price">{rub(r.priceFrom)}</div> : null}
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}
            </div>

            <aside>
              <div className="booking">
                <div className="booking__head"><h3>Выберите дату</h3></div>
                <div className="booking__body">
                  <div className="booking__date-list">
                    {sessions.slice(0, 6).map((s, i) => (
                      <div key={s.id} className={`booking__date ${i === 0 ? 'is-active' : ''}`}>
                        <div><strong>{s.dateLabel}</strong><br /><small>{s.timeLabel}</small></div>
                        <span className="dot" />
                      </div>
                    ))}
                  </div>
                  <div className="booking__price-row">
                    <div className="booking__price"><small>Билеты от</small>{rub(price)}</div>
                    <div className="booking__price-note">Без скрытых<br />сборов</div>
                  </div>
                  <Link href={ctaUrl || '#'} className="btn btn--primary btn--lg booking__cta">Выбрать места</Link>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
      <V2Trust />
    </div>
  );
}