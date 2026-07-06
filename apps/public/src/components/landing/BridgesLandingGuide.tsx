import { Anchor, Clock, MapPin, Ship, Thermometer } from 'lucide-react';

import { BRIDGES_LANDING } from '@/data/bridges-landing';

function yandexMapsLink(lat: number, lng: number) {
  return `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
}

export function BridgesLandingGuide() {
  return (
    <div className="space-y-12 pb-4 pt-8">
    <section id="bridges-routes" className="container mx-auto px-4">
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
                <text x="205" y="150" fill="#f8fafc" fontSize="11" textAnchor="middle">Дворцовый</text>
                <text x="285" y="140" fill="#f8fafc" fontSize="11" textAnchor="middle">Троицкий</text>
                <text x="330" y="134" fill="#f8fafc" fontSize="11" textAnchor="middle">Литейный</text>
                <text x="52" y="238" fill="#86efac" fontSize="11">Старт</text>
                <text x="318" y="172" fill="#86efac" fontSize="11">Финиш</text>
                <text x="120" y="108" fill="#93c5fd" fontSize="10">Каналы</text>
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

      <section className="container mx-auto px-4">
        <div className="rounded-xl border border-border bg-card p-6 md:p-8">
          <div className="mb-4 flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-foreground">Расписание разводки мостов</h2>
          </div>
          <p className="mb-6 max-w-3xl text-sm leading-relaxed text-muted-foreground">{BRIDGES_LANDING.liftScheduleNote}</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="px-3 py-2 font-medium">Мост</th>
                  <th className="px-3 py-2 font-medium">Развод</th>
                  <th className="px-3 py-2 font-medium">Сведение</th>
                </tr>
              </thead>
              <tbody>
                {BRIDGES_LANDING.liftSchedule.map((row) => (
                  <tr key={row.shortName} className="border-b border-border/70 last:border-0">
                    <td className="px-3 py-3 font-medium text-foreground">
                      {row.name}
                      {row.note ? <span className="mt-1 block text-xs font-normal text-primary">{row.note}</span> : null}
                    </td>
                    <td className="px-3 py-3 text-foreground">{row.lift}</td>
                    <td className="px-3 py-3 text-muted-foreground">{row.lower}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="container mx-auto px-4">
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

      <section className="container mx-auto px-4">
        <div className="mb-6 flex items-center gap-2">
          <Anchor className="h-5 w-5 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Где садиться на теплоход</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          {BRIDGES_LANDING.piers.map((pier) => (
            <article key={pier.name} className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-1 font-semibold text-foreground">{pier.name}</h3>
              <p className="mb-2 text-sm text-primary">{pier.landmark}</p>
              <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{pier.hint}</p>
              <a
                href={yandexMapsLink(pier.coords.lat, pier.coords.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80"
              >
                <MapPin className="h-4 w-4" />
                Открыть на карте
              </a>
            </article>
          ))}
        </div>
        <p className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
          <Thermometer className="mt-0.5 h-4 w-4 shrink-0" />
          Ночью на причале много туристов — приходите заранее, держите под рукой билет и номер судна из подтверждения.
        </p>
      </section>
    </div>
  );
}
