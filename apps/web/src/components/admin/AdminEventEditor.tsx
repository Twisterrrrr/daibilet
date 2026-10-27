import {
  AdminBadge,
  AdminButton,
  AdminField,
  AdminPageHeader,
  AdminSection,
  AdminStat,
  adminInputClass,
  adminMonoInputClass,
  adminTextareaClass,
} from '@/components/admin/AdminUi';
import { AdminEventDescriptionRewrite } from '@/components/admin/AdminEventDescriptionRewrite.client';
import { AdminQueueFields } from '@/components/admin/AdminQueueFields';
import { AdminEventSourceSummary } from '@/components/admin/AdminEventSourceSummary';
import { AdminEventTabs } from '@/components/admin/AdminEventTabs.client';
import { AdminEventTaxonomyForm } from '@/components/admin/AdminEventTaxonomyForm';
import { AdminEventVenueLinksForm } from '@/components/admin/AdminEventVenueLinksForm';
import {
  AdminEventSalesPanel,
  AdminEventSchedulePanel,
  AdminEventSourcePanel,
} from '@/components/admin/AdminEventOpsPanels';
import {
  saveAdminEventModerationAction,
  saveAdminEventOverrideAction,
} from '@/server/admin-event-actions';
import type { AdminEventDetailData, AdminTaxonomyData } from '@/server/admin-events-data';
import { formatAdminNumber, PUBLIC_SITE_BASE } from '@/lib/admin-ui';
import { AdminPdpEditor } from '@/components/admin/AdminVenuePdpEditor.client';
import type { AdminPdpEditorData } from '@/server/admin-pdp-data';

const MODERATION_STATUSES = [
  { status: 'DRAFT', label: 'Черновик' },
  { status: 'REVIEW', label: 'На проверке' },
  { status: 'READY', label: 'Готово' },
] as const;

const EVENT_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  REVIEW: 'На проверке',
  READY: 'Готово к публикации',
  PUBLISHED: 'Опубликовано на сайте',
  HIDDEN: 'Скрыто на сайте',
};

const EDITOR_STATUS_LABELS: Record<string, string> = {
  DRAFT: 'Черновик',
  REVIEW: 'На проверке',
  READY: 'Готово к проверке',
  PUBLISHED: 'Старая служебная отметка «Опубликовано»',
  HIDDEN: 'Старая служебная отметка «Скрыто»',
};

type Props = {
  detail: AdminEventDetailData;
  taxonomy: AdminTaxonomyData;
  notice?: string | null;
  queue?: { back?: string; next?: string };
  pdpData?: AdminPdpEditorData;
};

export function AdminEventEditor({ detail, taxonomy, notice, queue, pdpData }: Props) {
  const override = detail.override;
  const currentStatus = (override.editorStatus || 'REVIEW').toUpperCase();
  const statusLabel = EDITOR_STATUS_LABELS[currentStatus] || 'Не указано';
  const eventStatus = (detail.event.status || '').toUpperCase();
  const eventStatusLabel = EVENT_STATUS_LABELS[eventStatus] || 'Статус события не передан';
  const displayTitle = override.title || detail.sourceTitle;
  const isImported = detail.event.managementMode === 'SOURCE_MANAGED'
    || /TICKETSCLOUD|TEPLOHOD/i.test(detail.source.sourceLabel || '');

  return (
    <div className="space-y-5">
      <AdminPageHeader
        breadcrumbs={[{ label: 'События', href: '/admin/events' }, { label: detail.id }]}
        title={displayTitle}
        description={isImported
          ? 'Импортированное событие. Источник управляет расписанием и продажей; правки здесь относятся только к карточке Дайбилет.'
          : 'Поля события сгруппированы по задачам. Каждая доступная секция сохраняется отдельно.'}
        badge={<AdminBadge tone={eventStatus === 'PUBLISHED' ? 'success' : eventStatus === 'HIDDEN' ? 'danger' : 'neutral'}>Статус события: {eventStatusLabel}</AdminBadge>}
        actions={
          detail.slug ? (
            <AdminButton
              href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/events/${encodeURIComponent(detail.slug)}`}
              target="_blank"
              rel="noreferrer"
            >
              Открыть на сайте
            </AdminButton>
          ) : null
        }
      />

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
        </div>
      ) : null}

      {isImported ? (
        <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
          <strong>Импортированное событие.</strong> Источник управляет расписанием, доступностью, тарифами и квотами. Контент, классификация, связи и SEO редактируются только в каталоге Дайбилет. Эти изменения не отправляются поставщику. Фактическая видимость на сайте определяется статусом события выше; в этой карточке менять его нельзя.
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <AdminStat label="Слотов" value={formatAdminNumber(detail.summary.slots)} />
        <AdminStat label="Офферов" value={formatAdminNumber(detail.summary.offers)} />
        <AdminStat
          label="Цена от"
          value={detail.summary.priceFrom == null ? null : formatAdminNumber(detail.summary.priceFrom)}
          suffix="₽"
        />
        <AdminStat label="Заказов" value={formatAdminNumber(detail.summary.orders)} />
      </div>

      <AdminEventTabs
        tabs={[
          {
            id: 'overview',
            label: 'Обзор',
            content: (
              <>
                <AdminEventSourceSummary detail={detail} />
                <AdminSection
        title="Отметка контентной проверки"
        description="Служебная отметка в EventOverride. Она не меняет фактический статус события, видимость на сайте или данные поставщика."
        actions={
          <AdminBadge tone={currentStatus === 'PUBLISHED' || currentStatus === 'HIDDEN' ? 'warning' : 'neutral'}>
            Служебная отметка: {statusLabel}
          </AdminBadge>
        }
      >
        {detail.publishBlockers.length ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Замечания к готовности карточки: {detail.publishBlockers.slice(0, 4).join(' · ')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {MODERATION_STATUSES.map((item) => {
            return (
              <form key={item.status} action={saveAdminEventModerationAction}>
                <input type="hidden" name="id" value={detail.id} />
                <input type="hidden" name="slug" value={detail.slug || ''} />
                <input type="hidden" name="editorStatus" value={item.status} />
                <AdminQueueFields back={queue?.back} next={queue?.next} />
                <AdminButton
                  type="submit"
                  variant={currentStatus === item.status ? 'primary' : 'secondary'}
                >
                  {item.label}
                </AdminButton>
              </form>
            );
          })}
        </div>
      </AdminSection>
              </>
            ),
          },
          {
            id: 'content',
            label: 'Описание и информация',
            content: (
      <form action={saveAdminEventOverrideAction}>
        <input type="hidden" name="id" value={detail.id} />
        <input type="hidden" name="slug" value={detail.slug || ''} />
        <input type="hidden" name="section" value="content" />
        <AdminQueueFields back={queue?.back} next={queue?.next} />
        <AdminSection
          title="Контент"
          description={`Это контентный override Дайбилет. Пустое поле использует значение источника. В источнике: ${detail.sourceTitle}`}
          actions={
            <AdminButton type="submit" variant="primary">
              Сохранить контент
            </AdminButton>
          }
        >
          <div className="space-y-3">
            <AdminField label="Заголовок">
              <input
                name="title"
                defaultValue={override.title || ''}
                className={adminInputClass}
                placeholder={detail.sourceTitle}
              />
            </AdminField>
            <AdminField label="Короткое описание">
              <textarea
                name="shortDescription"
                rows={2}
                defaultValue={override.shortDescription || ''}
                className={adminTextareaClass}
              />
            </AdminField>
            <AdminEventDescriptionRewrite
              eventId={detail.id}
              sourceDescription={detail.sourceDescription}
              initialDescription={override.description || ''}
            />
            <AdminField
              label="mergeGroupKey"
              hint="Склеивает дубли одного события (например, «Екатерина» и «Потёмкин») в одну карточку."
            >
              <input
                name="mergeGroupKey"
                defaultValue={override.mergeGroupKey || ''}
                className={adminMonoInputClass}
              />
            </AdminField>
          </div>
        </AdminSection>
      </form>
            ),
          },
          {
            id: 'seo',
            label: 'SEO',
            content: (
      <form action={saveAdminEventOverrideAction}>
        <input type="hidden" name="id" value={detail.id} />
        <input type="hidden" name="slug" value={detail.slug || ''} />
        <input type="hidden" name="section" value="seo" />
        <AdminQueueFields back={queue?.back} next={queue?.next} />
        <AdminSection
          title="SEO"
          description="Поля сохраняются как SEO-правка Дайбилет. Пустое поле = сброс к источнику; данные поставщика не меняются."
          actions={
            <AdminButton type="submit" variant="primary">
              Сохранить SEO
            </AdminButton>
          }
        >
          <div className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <AdminField label="SEO H1">
                <input
                  name="seoH1"
                  defaultValue={override.seoH1 || ''}
                  className={adminInputClass}
                />
              </AdminField>
              <AdminField label="SEO title">
                <input
                  name="seoTitle"
                  defaultValue={override.seoTitle || ''}
                  className={adminInputClass}
                />
              </AdminField>
            </div>
            <AdminField label="SEO description">
              <textarea
                name="seoDescription"
                rows={3}
                defaultValue={override.seoDescription || ''}
                className={adminTextareaClass}
              />
            </AdminField>
            <AdminField label="canonicalPath">
              <input
                name="canonicalPath"
                defaultValue={override.canonicalPath || ''}
                className={adminMonoInputClass}
              />
            </AdminField>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="isIndexable"
                defaultChecked={override.isIndexable === true}
                className="h-4 w-4 rounded border-slate-300"
              />
              Индексировать (isIndexable)
            </label>
          </div>
        </AdminSection>
      </form>
            ),
          },
          {
            id: 'media',
            label: 'Медиа',
            content: (
      <form action={saveAdminEventOverrideAction}>
        <input type="hidden" name="id" value={detail.id} />
        <input type="hidden" name="slug" value={detail.slug || ''} />
        <input type="hidden" name="section" value="media" />
        <AdminQueueFields back={queue?.back} next={queue?.next} />
        <AdminSection
          title="Медиа"
          description="Изображение карточки Дайбилет. Пустое поле использует фото источника; файл поставщика не изменяется."
          actions={
            <AdminButton type="submit" variant="primary">
              Сохранить медиа
            </AdminButton>
          }
        >
          <AdminField
            label="Изображение (заменяет источник)"
            hint={detail.sourceImageUrl ? `В источнике: ${detail.sourceImageUrl}` : undefined}
          >
            <input
              name="imageUrl"
              defaultValue={override.imageUrl || ''}
              className={adminMonoInputClass}
              placeholder={detail.sourceImageUrl || ''}
            />
          </AdminField>
        </AdminSection>
      </form>
            ),
          },
          {
            id: 'structure',
            label: 'Площадка и классификация',
            content: (
              <>
                <AdminEventTaxonomyForm
                  eventId={detail.id}
                  eventSlug={detail.slug}
                  classification={detail.classification}
                  taxonomy={taxonomy}
                  queue={queue}
                  sourceManaged={isImported}
                />
                <AdminEventVenueLinksForm
                  eventId={detail.id}
                  eventSlug={detail.slug}
                  venueLinks={detail.venueLinks}
                  queue={queue}
                />
              </>
            ),
          },
          {
            id: 'schedule',
            label: 'Расписание',
            content: <AdminEventSchedulePanel detail={detail} />,
          },
          {
            id: 'tickets',
            label: 'Тарифы и квоты',
            content: <AdminEventSalesPanel detail={detail} />,
          },
          {
            id: 'data',
            label: 'Источник и диагностика',
            content: <AdminEventSourcePanel detail={detail} />,
          },
          ...(detail.slug && pdpData ? [{
            id: 'pdp',
            label: 'Страница события',
            content: (
              <AdminPdpEditor
                entity="events"
                entityId={detail.id}
                entitySlug={detail.slug}
                variants={pdpData.variants}
                initialDocument={pdpData.document}
                initialVariant="event"
                initialError={pdpData.error}
              />
            ),
          }] : []),
        ]}
      />
    </div>
  );
}
