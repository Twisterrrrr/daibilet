import { MapPin, Ship } from 'lucide-react';

import { BRIDGES_LANDING } from '@/data/bridges-landing';

export function BridgesShipChecklist() {
  return (
    <section className="container-page py-10 md:py-12">
      <div className="mb-6 flex items-center gap-2">
        <Ship className="h-5 w-5 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">На что смотреть при выборе теплохода</h2>
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
    <div className="space-y-12 pb-4 pt-8">
      <section id="bridges-routes" className="container-page">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:items-start">
          <div>
            <h2 className="mb-3 text-2xl font-bold text-foreground md:text-3xl">Маршруты прогулок</h2>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Маршруты сильно отличаются: одни идут только по Большой Неве, другие заходят в каналы. Сравните траекторию до покупки.
            </p>
            <div className="space-y-4">
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
          </div>

          <div className="rounded-xl border border-border bg-slate-950 p-5 text-slate-100">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-300">
              <MapPin className="h-4 w-4" />
              Схема маршрута
            </div>
            <div className="relative mx-auto aspect-[4/3] max-w-md">
              <svg viewBox="0 0 400 300" className="h-full w-full" role="img" aria-label="Схема ночного маршрута по Неве и каналам">
                <rect width="400" height="300" fill="#0f172a" rx="12" />
                <path d="M40 220 C120 180, 180 160, 360 150" stroke="#38bdf8" strokeWidth="10" fill="none" strokeLinecap="round" />
                <path d="M80 120 C140 130, 200 170, 260 210" stroke="#60a5fa" strokeWidth="6" fill="none" strokeLinecap="round" opacity="0.7" />
                <circle cx="210" cy="168" r="8" fill="#fbbf24" />
                <circle cx="285" cy="158" r="8" fill="#fbbf24" />
                <circle cx="330" cy="152" r="8" fill="#fbbf24" />
                <circle cx="70" cy="218" r="7" fill="#34d399" />
                <circle cx="360" cy="150" r="7" fill="#34d399" />
                <text x="205" y="150" fill="#f8fafc" fontSize="11" textAnchor="middle">
                  Дворцовый
                </text>
                <text x="285" y="140" fill="#f8fafc" fontSize="11" textAnchor="middle">
                  Троицкий
                </text>
                <text x="330" y="134" fill="#f8fafc" fontSize="11" textAnchor="middle">
                  Литейный
                </text>
                <text x="52" y="238" fill="#86efac" fontSize="11">
                  Старт
                </text>
                <text x="318" y="172" fill="#86efac" fontSize="11">
                  Финиш
                </text>
                <text x="120" y="108" fill="#93c5fd" fontSize="10">
                  Каналы
                </text>
                <text x="200" y="280" fill="#94a3b8" fontSize="11" textAnchor="middle">
                  Большая Нева · разводка ≈ 01:10–02:00
                </text>
              </svg>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              Жёлтые точки — мосты на маршруте. Зелёные — типичные точки посадки и возврата. Точный путь смотрите в описании выбранного рейса.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
