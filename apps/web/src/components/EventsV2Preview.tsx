import Link from 'next/link';
import { Fragment } from 'react';
import { Search } from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { V2EventCard } from '@/components/V2EventCard';
import { fontUnbounded } from '@/lib/fonts';
import { pluralEvents } from '@/lib/format';
import { collectCatalogLabels } from '@/lib/catalog-labels';
import { buildCatalogHref } from '@/lib/catalog-url';
import type { BlogCardDto } from '@/lib/blog-utils';
import type { PublicCatalogDto, PublicLandingDto } from '@daibilet/contracts/public';

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

type Props = {
  catalog: PublicCatalogDto;
  landings?: PublicLandingDto[];
  articles?: BlogCardDto[];
};

export function EventsV2Preview({ catalog, landings = [], articles = [] }: Props) {
  const items = catalog?.items ?? [];
  const cats = catalog?.facets?.categories ?? [];
  const featured = items.filter((it) => it.imageUrl).slice(0, 5);

  const groups: Array<{ category: string; items: typeof items }> = [];
  for (const it of items) {
    const key = collectCatalogLabels(it, 1)[0] || it.category || 'Другое';
    let group = groups.find((g) => g.category === key);
    if (!group) {
      group = { category: key, items: [] };
      groups.push(group);
    }
    group.items.push(it);
  }
  const rails = groups.filter((g) => g.items.length >= 2).sort((a, b) => b.items.length - a.items.length);

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
            <div className="search-compact">
              <span className="search-compact__icon"><Search className="h-4 w-4" aria-hidden /></span>
              <input type="text" placeholder="Событие, площадка или артист" />
            </div>
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
                <div className="featured-carousel">
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

          {landings.length ? (
            <section className="section">
              <div className="container">
                <div className="bottom-cta__inner">
                  <div>
                    <h2>Подборки</h2>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-white/90">
                      {landings.slice(0, 4).map((l) => (
                        <li key={l.slug}>
                          <Link href={`/podborki/${l.slug}`} className="text-white/90 hover:text-white">{l.title}</Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Link href="/podborki" className="btn btn--white btn--lg">Смотреть подборки →</Link>
                </div>
              </div>
            </section>
          ) : null}

          {rails.map((group, idx) => (
            <Fragment key={group.category}>
              <section className="section carousel">
                <div className="container">
                  <div className="carousel__head">
                    <div>
                      <h2>{group.category}</h2>
                      <p>{pluralEvents(group.items.length)} · выбор редакции</p>
                    </div>
                    <Link href={buildCatalogHref({ q: group.category })} className="link-more">Смотреть всё →</Link>
                  </div>
                  <div className="scroller">{group.items.map((item) => <V2EventCard key={item.id} item={item} />)}</div>
                </div>
              </section>
              {idx === 1 && articles.length ? (
                <section className="section">
                  <div className="container">
                    <div className="bottom-cta__inner">
                      <div>
                        <h2>Статьи</h2>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-white/90">
                          {articles.slice(0, 4).map((a) => (
                            <li key={a.slug}>
                              <Link href={`/blog/${a.slug}`} className="text-white/90 hover:text-white">{a.title}</Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <Link href="/blog" className="btn btn--white btn--lg">Читать →</Link>
                    </div>
                  </div>
                </section>
              ) : null}
            </Fragment>
          ))}

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