import { ArrowUpRight, Clock, Download, Flag, Globe, Lock, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { InfoNote, PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const featureFlags = [
  { id: 'venue-pages', label: 'Карточки площадок', enabled: true },
  { id: 'managed-landings', label: 'Управляемые SEO-лендинги', enabled: true },
  { id: 'provider-widgets', label: 'Покупка через виджеты провайдеров', enabled: true },
  { id: 'teplohod-sync', label: 'Импорт Teplohod.info', enabled: true },
  { id: 'orders-mirror', label: 'Зеркало заказов источников', enabled: true },
];

const PUBLIC_BASE =
  ((import.meta as ImportMeta & { env?: { VITE_DAIBILET_PUBLIC_URL?: string } }).env?.VITE_DAIBILET_PUBLIC_URL as string | undefined) ||
  'https://daibilet.ru';

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Операционная конфигурация MVP импорта продаж. Без лишней CRM-сложности: источники, базовый URL витрины, роли и флаги только для чтения."
      />

      <div className="grid gap-4">
        <Card className="border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" />
                Команда и роли
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Доступ к admin API закрыт Basic Auth (nginx + backend). Роли ниже — UX-контур на будущее; смена прав из UI пока недоступна.
              </p>
            </div>
            <Button size="sm" variant="outline" disabled>
              Пригласить
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <Role label="Админ" description="все разделы" />
            <Role label="Редактор" description="контент и модерация" />
            <Role label="SEO" description="лендинги и мета" />
            <Role label="Наблюдатель" description="только просмотр" />
          </div>
        </Card>

        <Card className="border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold">Импорты</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Текущая рабочая схема источников и ручного запуска синхронизации.</p>
            </div>
            <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
              <Link to="/sources">
                К источникам
                <ArrowUpRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Row icon={Clock} label="Ticketscloud" value="токен + gRPC/API; полный sync вручную" />
            <Row icon={Clock} label="Teplohod.info" value="API с белого IP (токен не нужен); sync из Источников" />
            <Row icon={Download} label="Окно ре-импорта" value="последние 90 дней / все активные события" />
            <Row icon={Download} label="Переопределения" value="сохраняются поверх импортных фактов" />
          </div>
        </Card>

        <Card className="border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Публичная витрина
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Базовые ссылки для превью из админки и SEO-каноникала.</p>
            </div>
            <Badge variant="outline">prod</Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Row label="Публичный сайт" value={PUBLIC_BASE} />
            <Row label="Админка" value="https://admin.daibilet.ru" />
            <Row label="Бренд" value="Дайбилет" />
            <Row label="Домен" value="daibilet.ru" />
          </div>
        </Card>

        <Card className="border-border p-4">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Фича-флаги</h2>
            <Badge variant="outline" className="gap-1 border-border font-normal text-muted-foreground">
              <Lock className="h-3 w-3" />
              только чтение
            </Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Показываем состояние MVP-функций, но не даём менять их из интерфейса без отдельного API-контракта.</p>

          <ul className="divide-y divide-border rounded-md border border-border">
            {featureFlags.map((flag) => (
              <li key={flag.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                  {flag.label}
                </span>
                <Badge variant={flag.enabled ? 'default' : 'outline'}>{flag.enabled ? 'on' : 'off'}</Badge>
              </li>
            ))}
          </ul>
        </Card>

        <InfoNote>
          <span className="inline-flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Секреты и пароли не хранятся в клиентском бандле — только в env backend / nginx.
          </span>
        </InfoNote>
      </div>
    </div>
  );
}

function Role(props: { label: string; description: string }) {
  return (
    <div className="rounded-md border border-border bg-secondary/20 px-3 py-2">
      <div className="text-sm font-medium">{props.label}</div>
      <div className="text-xs text-muted-foreground">{props.description}</div>
    </div>
  );
}

function Row(props: { icon?: typeof Clock; label: string; value: string }) {
  const Icon = props.icon;
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {props.label}
      </div>
      <div className="mt-0.5 break-all text-sm">{props.value}</div>
    </div>
  );
}
