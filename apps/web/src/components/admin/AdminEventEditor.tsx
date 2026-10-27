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
import { AdminEventOpsPanels } from '@/components/admin/AdminEventOpsPanels';
import {
  saveAdminEventModerationAction,
  saveAdminEventOverrideAction,
} from '@/server/admin-event-actions';
import type { AdminEventDetailData, AdminTaxonomyData } from '@/server/admin-events-data';
import { formatAdminNumber, PUBLIC_SITE_BASE } from '@/lib/admin-ui';
import type { AdminPdpEditorData } from '@/server/admin-pdp-data';
import { AdminEventPageEditor } from '@/components/admin/AdminEventPageEditor.client';
import type { AdminEventPageEditorData } from '@/server/admin-event-pages-data';
import { AdminEventSalesPanel } from '@/components/admin/AdminEventSalesPanel';
import type { AdminOrdersListData } from '@/server/admin-orders-data';

const MODERATION_STATUSES = [
  { status: 'DRAFT', label: 'Черновик' },
  { status: 'REVIEW', label: 'На проверке' },
  { status: 'READY', label: 'Готово' },
  { status: 'PUBLISHED', label: 'Опубликовать' },
  { status: 'HIDDEN', label: 'Скрыть' },
] as const;

type Props = {
  detail: AdminEventDetailData;
  taxonomy: AdminTaxonomyData;
  notice?: string | null;
  queue?: { back?: string; next?: string };
  pdpData?: AdminPdpEditorData;
  eventPageData?: AdminEventPageEditorData;
  salesData?: AdminOrdersListData | null;
  salesChannel?: string;
  salesStatus?: string;
};

export function AdminEventEditor({ detail, taxonomy, notice, queue, pdpData, eventPageData, salesData, salesChannel = 'all', salesStatus = 'all' }: Props) {
  const override = detail.override;
  const currentStatus = (override.editorStatus || 'REVIEW').toUpperCase();
  const statusLabel = MODERATION_STATUSES.find((item) => item.status === currentStatus)?.label ?? currentStatus;
  const canPublish = detail.canPublish !== false && detail.publishBlockers.length === 0;
  const displayTitle = override.title || detail.sourceTitle;

  return (
    <div className="space-y-5">
      <AdminPageHeader
        breadcrumbs={[{ label: 'События', href: '/admin/events' }, { label: detail.id }]}
        title={displayTitle}
        description="Правки хранятся поверх источника: пустое поле означает «как в источнике». Каждая секция сохраняется своей кнопкой."
        badge={<AdminBadge tone={currentStatus === 'PUBLISHED' ? 'success' : 'neutral'}>сейчас: {statusLabel}</AdminBadge>}
        actions={
          detail.slug ? (
            <AdminButton
              href={`${PUBLIC_SITE_BASE.replace(/\/$/, '')}/events/${encodeURIComponent(detail.slug)}`}
              target="_blank"
              rel="noreferrer"
            >
              Public
            </AdminButton>
          ) : null
        }
      />

      {notice ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-800">
          {notice}
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
        title="Модерация"
        description="Статус определяет, видно ли событие на витрине. «Опубликовать» доступно, когда устранены блокеры."
        actions={
          <AdminBadge tone={currentStatus === 'PUBLISHED' ? 'success' : 'neutral'}>
            сейчас: {statusLabel}
          </AdminBadge>
        }
      >
        {detail.publishBlockers.length ? (
          <p className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Блокеры публикации: {detail.publishBlockers.slice(0, 4).join(' · ')}
          </p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {MODERATION_STATUSES.map((item) => {
            const disabled = item.status === 'PUBLISHED' && !canPublish;
            return (
              <form key={item.status} action={saveAdminEventModerationAction}>
                <input type="hidden" name="id" value={detail.id} />
                <input type="hidden" name="slug" value={detail.slug || ''} />
                <input type="hidden" name="editorStatus" value={item.status} />
                <AdminQueueFields back={queue?.back} next={queue?.next} />
                <AdminButton
                  type="submit"
                  variant={currentStatus === item.status ? 'primary' : 'secondary'}
                  disabled={disabled}
                  title={disabled ? 'Публикация заблокирована: есть нерешённые замечания' : undefined}
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
            id: 'sales',
            label: 'Продажи',
            content: <AdminEventSalesPanel eventId={detail.id} data={salesData || null} channel={salesChannel} status={salesStatus} />,
          },
          {
            id: 'content',
            label: 'Контент',
            content: (
      <form action={saveAdminEventOverrideAction}>
        <input type="hidden" name="id" value={detail.id} />
        <input type="hidden" name="slug" value={detail.slug || ''} />
        <input type="hidden" name="section" value="content" />
        <AdminQueueFields back={queue?.back} next={queue?.next} />
        <AdminSection
          title="Контент"
          description={`Пустое поле - сброс к источнику. В источнике: ${detail.sourceTitle}`}
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
          description="Сниппет и индексация события. Пустое поле = сброс к источнику."
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
          description="Картинка карточки. Пустое поле - использовать изображение из источника."
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
            label: 'Таксономия и связи',
            content: (
              <>
                <AdminEventTaxonomyForm
                  eventId={detail.id}
                  eventSlug={detail.slug}
                  classification={detail.classification}
                  taxonomy={taxonomy}
                  queue={queue}
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
            id: 'data',
            label: 'Данные и диагностика',
            content: <AdminEventOpsPanels detail={detail} />,
          },
          ...(detail.slug && pdpData ? [{
            id: 'pdp',
            label: 'Подробности',
            content: (
              <AdminEventPageEditor
                eventId={detail.id}
                eventSlug={detail.slug}
                eventTitle={displayTitle}
                pageData={eventPageData || { page: null, error: 'EventPage API недоступен.' }}
                pdpData={pdpData}
              />
            ),
          }] : []),
        ]}
      />
    </div>
  );
}
