import Link from 'next/link';

import { SearchAutocomplete } from '@/components/search/SearchAutocomplete.client';
import { BlogCardSafeImage, SafeImage } from '@/components/SafeImage.client';
import { EventsDateCalendar } from '@/components/EventsDateCalendar.client';
import { V2EventCard } from '@/components/V2EventCard';
import { buildCatalogHref } from '@/lib/catalog-url';
import { eventHref } from '@/lib/routes';
import { fontUnbounded } from '@/lib/fonts';
import { formatPriceFrom, pluralEvents } from '@/lib/format';
import { resolveAfishaBlocks, type ResolvedAfishaBlock } from '@/lib/events-v2-blocks';
import type { BlogCardDto } from '@/lib/blog-utils';
import type { PublicCatalogDto, PublicDestinationDto, PublicLandingDto } from '@daibilet/contracts/public';

function SectionHeading({ title, description, href }: { title: string; description?: string; href?: string }) {
  return (
    <div className="carousel__head">
      <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
      {href ? <Link href={href} className="link-more">Смотреть всё →</Link> : null}
    </div>
  );
}

function EditorialBlock({ block, citySlug }: { block: ResolvedAfishaBlock; citySlug?: string | null }) {
  if (block.type === 'FEATURED_EVENTS') {
    return (
      <section className="section" data-afisha-block={block.type}>
        <div className="container">
          <div className="section__head"><div><h2>Стоит увидеть</h2><p>Выбор редакции</p></div><Link href={buildCatalogHref({ city: citySlug || undefined })} className="link-more">Вся афиша →</Link></div>
          <div className="featured-carousel">
            {block.items.map((event) => (
              <Link key={event.id} href={eventHref(event)} className="featured-card">
                {event.imageUrl ? <SafeImage src={event.imageUrl} alt="" fill sizes="(max-width: 720px) 84vw, 46vw" className="object-cover" /> : null}
                <div className="featured-card__body">
                  <span className="featured-card__tag">{event.catalogSubcategory?.title || event.category}</span>
                  <h3>{event.title}</h3>
                  <p>{event.dateLabel ? `${event.dateLabel} · ` : ''}{event.venue}</p>
                  <div className="featured-card__foot">
                    {event.priceFrom != null ? <span className="featured-card__price"><small>Билеты</small>{formatPriceFrom(event.priceFrom)}</span> : <span />}
                    <span className="featured-card__cta">Билеты <span aria-hidden="true">→</span></span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === 'EVENT_RAIL') {
    return (
      <section className="section carousel" data-afisha-block={block.type}>
        <div className="container">
          <SectionHeading title={block.title} description={`${pluralEvents(block.items.length)} в этой категории`} href={buildCatalogHref({ category: block.category, city: citySlug || undefined })} />
          <div className="scroller">{block.items.map((item) => <V2EventCard key={item.id} item={item} />)}</div>
        </div>
      </section>
    );
  }

  if (block.type === 'ARTICLE_RAIL' || block.type === 'ARTICLE') {
    const articles = block.type === 'ARTICLE' ? [block.item] : block.items;
    return (
      <section className="section" data-afisha-block={block.type}>
        <div className="container">
          <SectionHeading title={block.type === 'ARTICLE' ? 'Материал редакции' : 'Из блога'} href="/blog" />
          <div className="editorial-grid">
            {articles.map((article) => (
              <Link key={article.slug} href={`/blog/${article.slug}`} className="editorial-card">
                <span className="editorial-card__image">
                  <BlogCardSafeImage slug={article.slug} coverImageUrl={article.coverImageUrl} alt="" fill sizes="(max-width: 720px) 88vw, 32vw" className="object-cover" fallback={<span className="editorial-card__placeholder" aria-hidden="true" />} />
                </span>
                <span className="editorial-card__body"><span className="editorial-card__tag">{article.tag || 'Статья'}</span><strong>{article.title}</strong>{article.excerpt ? <span>{article.excerpt}</span> : null}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === 'COLLECTION') {
    return (
      <section className="section" data-afisha-block={block.type}>
        <div className="container">
          <SectionHeading title="Подборки" href="/podborki" />
          <div className="editorial-grid">
            {block.items.map((landing) => (
              <Link key={landing.slug} href={`/podborki/${landing.slug}`} className="collection-card">
                {landing.imageUrl || landing.heroImageUrl ? <SafeImage src={landing.imageUrl || landing.heroImageUrl || ''} alt="" fill sizes="(max-width: 720px) 88vw, 32vw" className="object-cover" /> : null}
                <span className="collection-card__body"><strong>{landing.title}</strong><span>{landing.events} событий</span></span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (block.type === 'CITY_HUB') {
    return (
      <section className="section" data-afisha-block={block.type}>
        <div className="container">
          <SectionHeading title="Афиша по городам" href="/cities" />
          <div className="city-hub-grid">{block.items.map((city) => <Link key={city.href} href={city.href} className="city-hub-link">{city.name}<span>Городской гид и события →</span></Link>)}</div>
        </div>
      </section>
    );
  }

  if (block.type === 'PROMO_BANNER') {
    return (
      <section className="section" data-afisha-block={block.type}>
        <div className="container">
          <Link href={block.href} className="promo-banner">
            {block.imageUrl ? <SafeImage src={block.imageUrl} alt="" fill sizes="100vw" className="object-cover" /> : null}
            <span><strong>{block.title}</strong><span>{block.description}</span><b>Подробнее →</b></span>
          </Link>
        </div>
      </section>
    );
  }

  if (block.type === 'ROUTE') {
    return (
      <section className="section" data-afisha-block={block.type}>
        <div className="container"><SectionHeading title="Готовые маршруты" href="/my-day" /><div className="route-grid">{block.items.map((route) => <Link key={route.href} href={route.href} className="promo-text"><span>Маршрут по городу</span><strong>{route.title}</strong><b>Открыть маршрут →</b></Link>)}</div></div>
      </section>
    );
  }

  return (
    <section className="section bottom-cta" data-afisha-block={block.type}>
      <div className="container"><div className="bottom-cta__inner"><div><h2>{block.title}</h2><p>{block.description}</p></div>{block.href ? <Link href={block.href === '/events' && citySlug ? buildCatalogHref({ city: citySlug }) : block.href} className="btn btn--white btn--lg">Перейти к поиску →</Link> : null}</div></div>
    </section>
  );
}

type Props = {
  catalog: PublicCatalogDto;
  landings?: PublicLandingDto[];
  articles?: BlogCardDto[];
  destinations?: PublicDestinationDto[];
  citySlug?: string | null;
  cityName?: string | null;
  routes?: Array<{ id: string; title: string }>;
  catalogUnavailable?: boolean;
};

export function EventsV2Preview({ catalog, landings = [], articles = [], destinations = [], citySlug = null, cityName = null, routes = [], catalogUnavailable = false }: Props) {
  const items = catalog?.items ?? [];
  const cats = catalog?.facets?.categories ?? [];
  const blocks = resolveAfishaBlocks({ catalog, landings, articles, citySlug, routes });
  const cityOptions = destinations.filter((destination) => destination.events > 0).slice().sort((a, b) => b.events - a.events).slice(0, 12);

  return (
    <div className={`v2 ${fontUnbounded.variable}`}>
      <div className="showcase">
        <div className="container">
          <div className="page-head">
            <nav className="breadcrumbs"><Link href="/">Главная</Link><span>/</span><span>Афиша</span></nav>
            <div className="page-head__row">
              <div>
                <h1>{cityName ? `Афиша ${cityName}` : 'Афиша России'}</h1>
                <p className="page-head__meta">{pluralEvents(catalog?.total ?? items.length).trim()} · выбор редакции</p>
              </div>
              <SearchAutocomplete
                context="events"
                className="search-compact"
                inputClassName="h-10 min-w-0 flex-1 bg-transparent text-sm text-graphite outline-none placeholder:text-graphite-muted"
                cityFilter={citySlug || undefined}
                catalogFilters={{ city: citySlug || undefined }}
                catalogPath="/events"
              />
            </div>
          </div>

          <EventsDateCalendar items={items} citySlug={citySlug} />

          {catalogUnavailable ? <p role="status" className="catalog-unavailable">Не удалось загрузить события. Попробуйте обновить страницу позже.</p> : null}

          <div className="quick-pills">
            <Link href="/afisha" className={`pill${!citySlug ? ' is-active' : ''}`}>Все города</Link>
            {cats.slice(0, 6).map((category) => <Link key={category.name} href={buildCatalogHref({ category: category.name, city: citySlug || undefined })} className="pill">{category.name}</Link>)}
          </div>
          {cityOptions.length ? (
            <div className="quick-pills" aria-label="Афиша по городам">
              {cityOptions.map((city) => {
                const slug = city.slug || city.sourceSlug || city.name;
                const active = slug === citySlug || city.name === cityName;
                const query = new URLSearchParams({ city: slug });
                return <Link key={city.id || slug} href={`/afisha?${query.toString()}`} className={`pill${active ? ' is-active' : ''}`}>{city.name}</Link>;
              })}
            </div>
          ) : null}
          {(catalog?.facets?.catalogLists ?? []).filter((list) => list.events > 0).slice(0, 8).length ? (
            <div className="quick-pills">
              {(catalog?.facets?.catalogLists ?? []).filter((list) => list.events > 0).slice(0, 8).map((list) => (
                <Link key={list.key} href={buildCatalogHref({ tag: list.key, city: citySlug || undefined })} className="pill">{list.title} · {list.events}</Link>
              ))}
            </div>
          ) : null}

          {blocks.map((block) => <EditorialBlock key={block.key} block={block} citySlug={citySlug} />)}
        </div>
      </div>
    </div>
  );
}
