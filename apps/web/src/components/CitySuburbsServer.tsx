import React from 'react';
import type { CitySuburbItem } from '@/lib/cityInfo';

/** Progressive city content: the complete suburb guide is readable in raw HTML
 * and without JavaScript; hydrated clients keep the richer route-planning UI.
 */
export function CitySuburbsServer({ cityName, suburbs }: { cityName: string; suburbs: CitySuburbItem[] }) {
  if (!suburbs.length) return null;
  return (
    <section id="city-suburbs" data-city-suburbs-server className="scroll-mt-28 border-t border-zinc-200 bg-white py-10 sm:py-12 lg:py-14">
      <div className="container-page max-w-4xl">
        <h2 className="font-display text-2xl font-bold text-zinc-950">Значимые пригороды: {cityName}</h2>
        <div className="mt-6 space-y-2">
          {suburbs.map((suburb, index) => (
            <details key={`${suburb.name}:${index}`} open={index === 0} className="group rounded-xl border border-zinc-200 bg-white">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-medium text-zinc-900 [&::-webkit-details-marker]:hidden">
                <span>{suburb.name}</span>
                <span aria-hidden="true" className="shrink-0 transition-transform group-open:rotate-180">▾</span>
              </summary>
              <div className="space-y-3 px-4 pb-4 text-sm leading-relaxed text-zinc-600">
                {suburb.desc ? <p>{suburb.desc}</p> : null}
                {suburb.travelVectorBlurb ? <p><strong>Как добраться: </strong>{suburb.travelVectorBlurb}</p> : null}
                {suburb.logisticsExit || suburb.stationName ? <p><strong>Где выходить: </strong>{suburb.logisticsExit || suburb.stationName}</p> : null}
                {suburb.timingNote ? <p>{suburb.timingNote}</p> : null}
                {suburb.places?.length ? (
                  <ol className="list-decimal space-y-2 pl-5">
                    {suburb.places.map((place, placeIndex) => (
                      <li key={`${place.name}:${placeIndex}`}>
                        <strong>{place.name}</strong>
                        {place.desc ? <span> — {place.desc}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
