import Link from 'next/link';

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
              <section>
                <h2>Что важно знать</h2>
                <div className="info-grid">
                  {event.venue ? <div className="info-card"><div><strong>Площадка</strong><span>{event.venue}</span></div></div> : null}
                  {event.ageLimit ? <div className="info-card"><div><strong>Возраст</strong><span>{event.ageLimit}</span></div></div> : null}
                  <div className="info-card"><div><strong>Билет</strong><span>Электронный билет · QR-код на входе</span></div></div>
                  {price ? <div className="info-card"><div><strong>Цена</strong><span>{rub(price)}</span></div></div> : null}
                </div>
              </section>

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