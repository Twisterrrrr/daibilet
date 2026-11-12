import Link from 'next/link';
import { Search } from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { V2EventCard } from '@/components/V2EventCard';
import { fontUnbounded } from '@/lib/fonts';
import type { PublicCatalogDto } from '@daibilet/contracts/public';

const DOW = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
const MONTH = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function calendar(items: { startsAt: string }[]) {
  const withEvents = new Set(items.map((i) => String(i.startsAt || '').slice(0, 10)));
  const today = new Date();
  const tiles = [];
  for (let i = 0; i < 14; i += 1) {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    const dow = d.getDay();
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const cls = ['cal-day'];
    if (dow === 0 || dow === 6) cls.push('is-weekend');
    if (i === 0) cls.push('is-today');
    if (!withEvents.has(iso)) cls.push('is-empty');
    tiles.push(
      <button key={iso} className={cls.join(' ')}>
        <span className="cal-day__dow">{i === 0 ? 'Сегодня' : DOW[dow]}</span>
        <span className="cal-day__num">{d.getDate()}</span>
        <span className="cal-day__month">{MONTH[d.getMonth()]}</span>
      </button>,
    );
  }
  return tiles;
}

export function EventsV2Preview({ catalog }: { catalog: PublicCatalogDto }) {
  const items = catalog?.items ?? [];
  const cats = catalog?.facets?.categories ?? [];
  const featured = items.slice(0, 2);

  return (
    <div className={`v2 ${fontUnbounded.variable}`}>
      <div className="showcase">
        <div className="container">
          <div className="page-head">
            <nav className="breadcrumbs"><Link href="/">Главная</Link><span>/</span><span>Афиша</span></nav>
            <div className="page-head__row">
              <div>
                <h1>Афиша Санкт-Петербурга</h1>
                <p className="page-head__meta"><strong>{catalog?.total ?? items.length}</strong> событий · выбор редакции</p>
              </div>
            </div>
            <form className="search-compact" onSubmit={(e) => e.preventDefault()}>
              <span className="search-compact__icon"><Search className="h-4 w-4" aria-hidden /></span>
              <input type="text" placeholder="Событие, площадка или артист" />
            </form>
          </div>

          <div className="calendar-wrap">
            <div className="calendar">{calendar(items)}</div>
          </div>

          <div className="quick-pills">
            <button className="pill is-active">Все</button>
            {cats.slice(0, 6).map((c) => <button key={c.name} className="pill">{c.name}</button>)}
          </div>

          {featured.length >= 2 ? (
            <section className="section">
              <div className="container">
                <div className="section__head">
                  <div><h2>Стоит увидеть</h2><p>События, на которые советуем обратить внимание в первую очередь</p></div>
                  <Link href="/events" className="link-more">Вся афиша →</Link>
                </div>
                <div className="featured-grid">
                  {featured.map((e) => (
                    <Link key={e.id} href={`/events/${e.eventPageSlug || e.slug || ''}`} className="featured-card">
                      {e.imageUrl ? <SafeImage src={e.imageUrl} alt="" fill sizes="50vw" className="object-cover" /> : null}
                      <div className="featured-card__body">
                        <span className="featured-card__tag">{e.category}</span>
                        <h3>{e.title}</h3>
                        <p>{e.dateLabel} · {e.venue}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </section>
          ) : null}

          <section className="section carousel">
            <div className="container">
              <div className="carousel__head">
                <div><h2>Ближайшие события</h2><p>{items.length} событий · выбрано редакцией</p></div>
              </div>
              <div className="scroller">{items.slice(0, 12).map((item) => <V2EventCard key={item.id} item={item} />)}</div>
            </div>
          </section>

          <section className="bottom-cta">
            <div className="container">
              <div className="bottom-cta__inner">
                <div>
                  <h2>Хотите увидеть всю афишу?</h2>
                  <p>Фильтры по дате, цене и категории — найдите именно то, что ищете.</p>
                </div>
                <Link href="/events" className="btn btn--white btn--lg">Перейти к поиску →</Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}