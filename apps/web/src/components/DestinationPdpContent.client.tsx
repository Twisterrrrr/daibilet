'use client';

import Link from 'next/link';
import { SafeImage } from '@/components/SafeImage.client';
import { destinationGalleryHeading, destinationMainPlacesHeading } from '@/lib/destination-pdp-labels';
import type { DestinationPdpPlaceItem, PublishedDestinationPdpDto } from '@daibilet/contracts/city-pdp';

export function DestinationPdpContent({ pdp, cityName, region, showFaq = true }: { pdp: PublishedDestinationPdpDto; cityName: string; region: boolean; showFaq?: boolean }) {
  const content = pdp.content;
  const gallery = content.gallery || [];
  const regionalPlaces = content.regionTopPlaces?.length ? content.regionTopPlaces : content.mustSee || [];
  const cityPlaces = content.mustSee?.length ? content.mustSee : content.sights || [];
  const mainPlaces = region ? regionalPlaces : cityPlaces;
  return <div className="bg-white">
    {(content.introTitle || content.introText) ? <section id="about" className="container-page py-8 sm:py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-700">{region ? 'Путеводитель по региону' : 'Путеводитель по городу'}</p>
      {content.introTitle ? <h2 className="mt-2 max-w-4xl text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">{content.introTitle}</h2> : null}
      {pdp.summary ? <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-700">{pdp.summary}</p> : null}
      {content.introText ? <p className="mt-3 max-w-3xl whitespace-pre-line text-base leading-7 text-slate-600">{content.introText}</p> : null}
      {region && content.regionBrief ? <p className="mt-4 max-w-3xl whitespace-pre-line text-sm leading-7 text-slate-600">{content.regionBrief}</p> : null}
    </section> : null}

    {mainPlaces.length ? <section id="city-must-see" className="container-page border-t border-slate-100 py-8 sm:py-12">
      <SectionHeading>{destinationMainPlacesHeading(cityName)}</SectionHeading>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {mainPlaces.map((place, index) => <PlaceCard key={`${place.name}-${index}`} place={place} />)}
      </div>
    </section> : null}

    {content.sights?.length && content.mustSee?.length ? <section className="container-page border-t border-slate-100 py-8 sm:py-12">
      <SectionHeading>Достопримечательности</SectionHeading>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{content.sights.map((place, index) => <PlaceCard key={`${place.name}-${index}`} place={place} />)}</div>
    </section> : null}

    {content.routes?.length ? <section id="city-routes" className="container-page border-t border-slate-100 py-8 sm:py-12">
      <SectionHeading>Маршруты и идеи поездок</SectionHeading>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">{content.routes.map((route, index) => <article key={`${route.title}-${index}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
        {route.imageUrl ? <div className="relative aspect-[16/7] bg-slate-200"><SafeImage src={route.imageUrl} alt="" fill sizes="(max-width: 768px) 100vw, 50vw" className="object-cover" /></div> : null}
        <div className="p-5"><h3 className="text-lg font-semibold text-slate-900">{route.title}</h3>{route.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{route.description}</p> : null}<p className="mt-3 text-xs text-slate-500">{[route.duration, route.distance].filter(Boolean).join(' · ')}</p>{route.stops?.length ? <ol className="mt-3 flex flex-wrap gap-2">{route.stops.map((stop, i) => <li key={`${stop}-${i}`} className="rounded-full bg-white px-3 py-1 text-xs text-slate-700">{stop}</li>)}</ol> : null}</div>
      </article>)}</div>
    </section> : null}

    {content.significantSuburbs?.length ? <section id="city-suburbs" className="container-page border-t border-slate-100 py-8 sm:py-12">
      <SectionHeading>Куда съездить рядом</SectionHeading>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{content.significantSuburbs.map((place, index) => <PlaceCard key={`${place.name}-${index}`} place={place} meta={[place.travelVector, place.travelTime].filter(Boolean).join(' · ')} />)}</div>
    </section> : null}

    {content.travelText ? <section className="container-page border-t border-slate-100 py-8 sm:py-12"><SectionHeading>Как спланировать поездку</SectionHeading><p className="mt-4 max-w-4xl whitespace-pre-line text-base leading-7 text-slate-600">{content.travelText}</p></section> : null}

    {gallery.length ? <section className="container-page border-t border-slate-100 py-8 sm:py-12"><SectionHeading>{destinationGalleryHeading(cityName)}</SectionHeading><div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">{gallery.map((item, index) => <figure key={`${item.url}-${index}`} className="overflow-hidden rounded-xl bg-slate-100"><div className="relative aspect-[4/3]"><SafeImage src={item.url} alt={item.alt} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover" /></div>{item.caption || item.credit ? <figcaption className="p-2 text-xs text-slate-600">{item.caption}{item.credit ? <span className="block text-slate-400">{item.credit}</span> : null}</figcaption> : null}</figure>)}</div></section> : null}

    {showFaq && content.faq?.length ? <section id="faq" className="container-page border-t border-slate-100 py-8 sm:py-12"><SectionHeading>Частые вопросы</SectionHeading><div className="mt-4 max-w-4xl divide-y divide-slate-200">{content.faq.map((item, index) => <details key={`${item.question}-${index}`} className="py-4"><summary className="cursor-pointer font-medium text-slate-900">{item.question}</summary><p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{item.answer}</p></details>)}</div></section> : null}
  </div>;
}

function PlaceCard({ place, meta }: { place: DestinationPdpPlaceItem; meta?: string }) {
  const body = <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
    {place.imageUrl ? <div className="relative aspect-[16/9] bg-slate-100"><SafeImage src={place.imageUrl} alt={place.imageAlt || ''} fill sizes="(max-width: 768px) 100vw, 33vw" className="object-cover" /></div> : null}
    <div className="p-4"><div className="flex items-start justify-between gap-3"><h3 className="font-semibold text-slate-950">{place.name}</h3>{place.cityName ? <span className="shrink-0 text-xs text-slate-500">{place.cityName}</span> : null}</div>{place.description ? <p className="mt-2 text-sm leading-6 text-slate-600">{place.description}</p> : null}{place.address ? <p className="mt-2 text-xs text-slate-500">{place.address}</p> : null}{meta ? <p className="mt-2 text-xs font-medium text-blue-700">{meta}</p> : null}</div>
  </article>;
  if (!place.href) return body;
  if (place.href.startsWith('/')) return <Link href={place.href} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{body}</Link>;
  return <a href={place.href} target="_blank" rel="noreferrer" className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-blue-500">{body}</a>;
}

function SectionHeading({ children }: { children: React.ReactNode }) { return <h2 className="text-xl font-semibold tracking-tight text-slate-950 sm:text-2xl">{children}</h2>; }
