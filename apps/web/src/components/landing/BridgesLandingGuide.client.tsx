'use client';

import { Ship } from 'lucide-react';

import { BRIDGES_LANDING } from '@/data/bridges-landing';

export function BridgesShipChecklist() {
  return (
    <section className="container-page py-10 md:py-12">
      <div className="mb-6 flex items-center gap-2">
        <Ship className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">
          {BRIDGES_LANDING.shipChecklistTitle || 'На что обратить внимание'}
        </h2>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {BRIDGES_LANDING.shipChecklist.map((item) => (
          <div key={item.title} className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-2 font-semibold text-foreground">{item.title}</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function BridgesLandingGuide() {
  return (
    <section id="bridges-routes" className="container-page pb-4 pt-8">
      <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">Маршруты прогулок</h2>
      <p className="mb-6 max-w-2xl text-muted-foreground">
        Маршруты сильно отличаются: одни идут только по Большой Неве, другие стартуют с каналов или уходят в залив. Сравните траекторию до покупки.
      </p>
      <div className="grid gap-4 lg:grid-cols-3">
        {BRIDGES_LANDING.routes.map((route) => (
          <article key={route.id} className="rounded-xl border border-border bg-card p-5">
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <h3 className="text-lg font-semibold text-foreground">{route.title}</h3>
              <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">{route.duration}</span>
              {route.highlight ? (
                <span className="rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-medium text-amber-700">{route.highlight}</span>
              ) : null}
            </div>
            <p className="mb-3 text-sm leading-relaxed text-muted-foreground">{route.description}</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {route.bridges.map((bridge) => (
                <span key={bridge} className="rounded-md border border-border px-2 py-1 text-foreground">
                  {bridge}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
