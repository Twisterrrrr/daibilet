import Link from 'next/link';
import { Headphones, RotateCcw, Search, ShieldCheck } from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { V2EventCard } from '@/components/V2EventCard';
import { fontUnbounded } from '@/lib/fonts';
import type { BlogCardDto } from '@/lib/blog-utils';
import type { PublicCatalogDto, PublicLandingDto } from '@daibilet/contracts/public';

type Props = {
  catalog: PublicCatalogDto;
  landings: PublicLandingDto[];
  articles: BlogCardDto[];
};

const rub = (n?: number | null) => (n ? `${n.toLocaleString('ru-RU')} ₽` : null);

export function HomeV2Preview({ catalog, landings, articles }: Props) {
  const items = catalog?.items ?? [];
  const featured = items[0];
  const picks = items.slice(0, 6);
  const popular = items.slice(2, 8);
  const guides = landings.slice(0, 3);

  return (
    <div className={`v2 ${fontUnbounded.variable}`}>
      <section className="hero">
        <div className="container">
          <div className="hero__grid">
            <div className="hero__content">
              <span className="badge">Афиша · Санкт-Петербург</span>
              <h1>Найдите своё <em>событие</em> в Петербурге</h1>
              <p className="hero__lead">Концерты, спектакли, выставки и прогулки — всё в одном месте.</p>
              <form className="search" onSubmit={(e) => e.preventDefault()}>
                <span className="search__icon"><Search className="h-5 w-5" aria-hidden /></span>
                <input type="text" placeholder="Событие, площадка или артист" />
                <button type="submit" className="btn btn--primary">Найти</button>
              </form>
              <div className="pills">
                {['Сегодня', 'Выходные', 'Концерты', 'Театр', 'Выставки', 'Бесплатно'].map((p, i) => (
                  <button key={p} className={`pill ${i === 0 ? 'is-active' : ''}`}>{p}</button>
                ))}
              </div>
            </div>

            {featured ? (
              <Link href={`/events/${featured.eventPageSlug || featured.slug || ''}`} className="featured-card">
                {featured.imageUrl ? <SafeImage src={featured.imageUrl} alt="" fill sizes="40vw" className="object-cover" /> : null}
                <div className="featured-card__body">
                  <span className="badge badge--white">Выбор редакции</span>
                  <h2>{featured.title}</h2>
                  <p>{featured.dateLabel} · {featured.venue}</p>
                  <div className="featured-card__foot">
                    <div className="featured-card__price"><small>Билеты от</small>{rub(featured.priceFrom)}</div>
                    <span className="btn btn--primary">Купить</span>
                  </div>
                </div>
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {picks.length ? (
        <section className="section">
          <div className="container">
            <div className="section__head">
              <div><h2>Выбор редакции</h2><p>События, на которые стоит пойти на этой неделе</p></div>
              <Link href="/events" className="link-more">Все события →</Link>
            </div>
            <div className="scroller">{picks.map((item) => <V2EventCard key={item.id} item={item} />)}</div>
          </div>
        </section>
      ) : null}

      {popular.length ? (
        <section className="section section--alt">
          <div className="container">
            <div className="section__head">
              <div><h2>Популярное сегодня</h2><p>Покупают прямо сейчас</p></div>
              <Link href="/events" className="link-more">Смотреть афишу →</Link>
            </div>
            <div className="grid">{popular.map((item) => <V2EventCard key={item.id} item={item} />)}</div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="container">
          <div className="promo">
            <div>
              <span className="badge badge--white">Инструмент</span>
              <h2>Соберите идеальный день в Петербурге</h2>
              <p>Выберите достопримечательности и события — получите готовый маршрут с картой и таймлайном.</p>
              <Link href="/my-day" className="btn btn--white btn--lg">Собрать маршрут →</Link>
            </div>
            <div className="mini-route">
              <div className="mini-route__item"><span className="mini-route__time">10:00</span><div><div className="mini-route__name">Эрмитаж</div><div className="mini-route__meta">2 часа · Дворцовая пл., 2</div></div></div>
              <div className="mini-route__item"><span className="mini-route__time">13:00</span><div><div className="mini-route__name">Обед на Мойке</div><div className="mini-route__meta">1 час · Большая Морская</div></div></div>
            </div>
          </div>
        </div>
      </section>
      {guides.length ? (
        <section className="section section--alt">
          <div className="container">
            <div className="section__head">
              <div><h2>Гид по Петербургу</h2><p>Подборки под конкретный запрос</p></div>
              <Link href="/podborki" className="link-more">Все подборки →</Link>
            </div>
            <div className="guide-grid">
              {guides.map((g) => (
                <Link key={g.slug} href={`/podborki/${g.slug}`} className="guide-card">
                  {g.imageUrl ? <SafeImage src={g.imageUrl} alt="" fill sizes="30vw" className="object-cover" /> : null}
                  <div className="guide-card__body">
                    <h3>{g.title}</h3>
                    {g.subtitle ? <p>{g.subtitle}</p> : null}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {articles.length ? (
        <section className="section">
          <div className="container">
            <div className="section__head">
              <div><h2>Читайте в блоге</h2><p>Помогаем выбрать и не переплачивать</p></div>
              <Link href="/blog" className="link-more">Все статьи →</Link>
            </div>
            <div className="blog-grid">
              {articles.slice(0, 3).map((post) => (
                <Link key={post.slug} href={`/blog/${post.slug}`} className="post">
                  <div className="post__media relative">
                    {post.coverImageUrl ? <SafeImage src={post.coverImageUrl} alt="" fill sizes="30vw" className="object-cover" /> : null}
                  </div>
                  <span className="post__tag">{post.tag}</span>
                  <h3>{post.title}</h3>
                  <p>{post.excerpt}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="trust">
        <div className="container trust__grid">
          {[
            { strong: 'Безопасная оплата', span: 'Все платежи защищены', key: 'pay', icon: <ShieldCheck className="h-5 w-5" aria-hidden /> },
            { strong: 'Без скрытых сборов', span: 'Цена, которую вы видите', key: 'fees', icon: <ShieldCheck className="h-5 w-5" aria-hidden /> },
            { strong: 'Возврат билетов', span: 'По правилам площадки', key: 'refund', icon: <RotateCcw className="h-5 w-5" aria-hidden /> },
            { strong: 'Поддержка 24/7', span: 'Ответим в чате и на почте', key: 'support', icon: <Headphones className="h-5 w-5" aria-hidden /> },
          ].map((item) => (
            <div key={item.key} className="trust__item">
              <div className="trust__icon">{item.icon}</div>
              <div><strong>{item.strong}</strong><span>{item.span}</span></div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}