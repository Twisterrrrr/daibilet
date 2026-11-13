import Link from 'next/link';
import { Search } from 'lucide-react';

import { SafeImage } from '@/components/SafeImage.client';
import { fontUnbounded } from '@/lib/fonts';
import { pluralVenues } from '@/lib/format';
import type { PublicVenueDto } from '@daibilet/contracts/public';

const typeLabel = (v: PublicVenueDto) => v.placeSubtype || v.placeType || v.type || 'Площадка';

function PlaceCard({ v }: { v: PublicVenueDto }) {
  return (
    <Link href={`/venues/${v.slug || ''}`} className="place-card">
      <div className="place-card__media">
        {v.heroImageUrl ? <SafeImage src={v.heroImageUrl} alt="" fill sizes="18rem" className="object-cover" /> : null}
        <span className="place-card__type">{typeLabel(v)}</span>
      </div>
      <div className="place-card__body">
        <div className="place-card__name">{v.name}</div>
        {v.address ? (
          <div className="place-card__addr">
            <span>{v.address}{v.metroStation ? ` · м. ${v.metroStation}` : ''}</span>
          </div>
        ) : null}
        {v.nextEvent ? (
          <div className="place-card__next">
            <span className="place-card__next-label">Ближайшее:</span>
            <span className="place-card__next-date">{v.nextEvent.dateLabel}</span>
            <span className="place-card__next-title">{v.nextEvent.title}</span>
          </div>
        ) : v.hookFact ? (
          <div className="place-card__next--empty">{v.hookFact}</div>
        ) : null}
      </div>
    </Link>
  );
}

export function PlacesV2Preview({ venues, total }: { venues: PublicVenueDto[]; total: number }) {
  const featured = venues.filter((v) => v.heroImageUrl).slice(0, 4);
  const types = Array.from(new Set(venues.map(typeLabel))).slice(0, 8);
  const groups = Array.from(new Set(venues.map(typeLabel)))
    .slice(0, 8)
    .map((type) => ({ type, venues: venues.filter((v) => typeLabel(v) === type) }))
    .filter((g) => g.venues.length);

  return (
    <div className={`v2 ${fontUnbounded.variable}`}>
      <div className="container">
        <div className="head">
          <nav className="breadcrumbs"><Link href="/">Главная</Link><span>/</span><span>Площадки</span></nav>
          <div className="head__row">
            <div>
              <h1>Площадки</h1>
              <p className="head__meta"><strong>{total}</strong> площадок · театры, клубы, музеи, лофты</p>
            </div>
          </div>
          <div className="search-compact">
            <span className="search-compact__icon"><Search className="h-4 w-4" aria-hidden /></span>
            <input type="text" placeholder="Название площадки или адрес" />
          </div>
        </div>

        <div className="type-tabs">
          <button className="type-tab is-active">Все<span className="count">{venues.length}</span></button>
          {types.map((t) => (
            <button key={t} className="type-tab">{t}</button>
          ))}
        </div>
      </div>

      {featured.length >= 3 ? (
        <section className="featured-places">
          <div className="container">
            <div className="featured-places__head">
              <div><h2>Главные площадки</h2><p>Театры, залы и пространства, которые определяют город</p></div>
            </div>
            <div className="featured-grid">
              {featured.map((v) => (
                <Link key={v.id} href={`/venues/${v.slug || ''}`} className="featured-place">
                  {v.heroImageUrl ? <SafeImage src={v.heroImageUrl} alt="" fill sizes="24rem" className="object-cover" /> : null}
                  <div className="featured-place__body">
                    <span className="featured-place__type">{typeLabel(v)}</span>
                    <h3>{v.name}</h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {groups.map((group) => (
        <section key={group.type} className="places-section">
          <div className="container">
            <div className="featured-places__head">
              <div>
                <h2>{group.type}</h2>
                <p>{pluralVenues(group.venues.length)}</p>
              </div>
              <Link href="/places" className="link-more">Все площадки →</Link>
            </div>
            <div className="places-grid">
              {group.venues.slice(0, 4).map((v) => <PlaceCard key={v.id} v={v} />)}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
}