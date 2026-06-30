import { ArrowUpRight, Clock, Download, Flag, Globe, Lock, ShieldCheck, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

import { InfoNote, PageHeader } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

const featureFlags = [
  { id: 'venue-pages', label: 'Карточки площадок', enabled: true },
  { id: 'managed-landings', label: 'Управляемые SEO-лендинги', enabled: true },
  { id: 'provider-widgets', label: 'Внешняя покупка через provider widgets', enabled: true },
  { id: 'teplohod-sync', label: 'Teplohod.info import', enabled: true },
  { id: 'orders-mirror', label: 'Зеркало заказов источников', enabled: true },
];

export function SettingsPage() {
  return (
    <div>
      <PageHeader
        title="Настройки"
        description="Операционная конфигурация Imported Sales MVP. Без лишней CRM-сложности: источники, базовый storefront URL, роли и read-only флаги."
      />

      <div className="grid gap-4">
        <Card className="border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-muted-foreground" />
                Команда и роли
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Для локального MVP аутентификация отключена, но UX-контур ролей оставляем совместимым с Admin V4.</p>
            </div>
            <Button size="sm" variant="outline" disabled>
              Пригласить
            </Button>
          </div>

          <div className="grid gap-2 md:grid-cols-4">
            <Role label="Admin" description="все разделы" />
            <Role label="Editor" description="контент и модерация" />
            <Role label="SEO" description="лендинги и мета" />
            <Role label="Viewer" description="только просмотр" />
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
            <Row icon={Clock} label="Ticketscloud" value="token + gRPC/API; full sync вручную" />
            <Row icon={Clock} label="Teplohod.info" value="API с белого IP (токен не нужен); sync из Sources" />
            <Row icon={Download} label="Окно ре-импорта" value="последние 90 дней / все активные события" />
            <Row icon={Download} label="Override-данные" value="сохраняются поверх импортных фактов" />
          </div>
        </Card>

        <Card className="border-border p-4">
          <div className="mb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Globe className="h-4 w-4 text-muted-foreground" />
                Public storefront
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">Базовые ссылки для preview из админки и SEO canonical.</p>
            </div>
            <Badge variant="outline">local</Badge>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Row label="Локальный public" value="http://127.0.0.1:5178" />
            <Row label="Локальная админка" value="http://127.0.0.1:5176" />
            <Row label="Production brand" value="Дайбилет" />
            <Row label="Production domain" value="daibilet.ru" />
          </div>
        </Card>

        <Card className="border-border p-4">
          <div className="mb-1 flex items-center gap-2">
            <h2 className="text-sm font-semibold">Фича-флаги</h2>
            <Badge variant="outline" className="gap-1 border-border font-normal text-muted-foreground">
              <Lock className="h-3 w-3" />
              read-only
            </Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">Показываем состояние MVP-функций, но не даем менять их из интерфейса без отдельного backend-контракта.</p>

          <ul className="divide-y divide-border rounded-md border border-border">
            {featureFlags.map((flag) => (
              <li key={flag.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm">{flag.label}</span>
                </div>
                <Badge variant="outline" className={flag.enabled ? 'border-success/30 bg-success/10 text-success' : 'border-border text-muted-foreground'}>
                  {flag.enabled ? 'вкл' : 'выкл'}
                </Badge>
              </li>
            ))}
          </ul>

          <InfoNote>После подключения production-auth этот экран станет местом для ролей, публичного base URL и безопасных read-only диагностик.</InfoNote>
        </Card>
      </div>
    </div>
  );
}

function Role({ label, description }: { label: string; description: string }) {
  return (
    <div className="rounded-md border border-border bg-surface-muted px-3 py-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{description}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon?: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface-muted px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
        {label}
      </div>
      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}
