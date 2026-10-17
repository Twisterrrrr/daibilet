import {
  AdminButton,
  AdminCheckbox,
  AdminDangerZone,
  AdminField,
  AdminFormActions,
  AdminNotice,
  AdminPageHeader,
  AdminSection,
  adminInputClass,
  adminMonoInputClass,
  adminSelectClass,
  adminTextareaClass,
} from '@/components/admin/AdminUi';
import {
  archiveAdminArticleAction,
  saveAdminArticleAction,
} from '@/server/admin-article-actions';
import {
  ARTICLE_AUTHOR_OPTIONS,
  ARTICLE_STATUS_OPTIONS,
  type AdminArticleDetail,
} from '@/server/admin-articles-data';
import { PUBLIC_SITE_BASE } from '@/lib/admin-ui';

function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

type Props = {
  mode: 'create' | 'edit';
  article?: AdminArticleDetail | null;
  notice?: string | null;
};

export function AdminArticleEditor({ mode, article, notice }: Props) {
  const isNew = mode === 'create';
  const id = isNew ? 'new' : article?.id || '';

  return (
    <div className="space-y-5">
      <AdminPageHeader
        breadcrumbs={[
          { label: 'Блог', href: '/admin/articles' },
          { label: isNew ? 'Новая статья' : article?.slug || id },
        ]}
        title={isNew ? 'Новая статья' : article?.title || 'Редактирование'}
        description={
          isNew
            ? 'Заполните основное и текст, затем сохраните - статья появится как черновик.'
            : 'Все изменения применяются одной кнопкой «Сохранить» внизу страницы.'
        }
        actions={
          !isNew ? (
            <AdminButton
              href={`/admin/articles/${encodeURIComponent(id)}/preview`}
              target="_blank"
              rel="noreferrer"
              variant="warning"
            >
              Превью
            </AdminButton>
          ) : null
        }
      />

      {notice ? <AdminNotice>{notice}</AdminNotice> : null}

      <form action={saveAdminArticleAction} className="space-y-4">
        <input type="hidden" name="id" value={id} />

        <AdminSection
          title="Основное"
          description="Заголовок, адрес и анонс - то, что видно в списке блога и в сниппете поиска."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <AdminField label="Заголовок">
              <input
                name="title"
                required
                defaultValue={article?.title || ''}
                className={adminInputClass}
              />
            </AdminField>
            <AdminField label="Slug">
              <input
                name="slug"
                required
                defaultValue={article?.slug || ''}
                className={adminInputClass}
              />
            </AdminField>
          </div>
          <div className="mt-3">
            <AdminField label="Анонс (excerpt)">
              <textarea
                name="excerpt"
                rows={3}
                defaultValue={article?.excerpt || ''}
                className={adminTextareaClass}
              />
            </AdminField>
          </div>
        </AdminSection>

        <AdminSection
          title="Текст"
          description="Разметка: ## - подзаголовки, [image side=left|right src=«/images/...» alt=«...»] - фото, [NOTE label=«...» text=«...»] - врезка."
        >
          <AdminField label="Content">
            <textarea
              name="content"
              rows={18}
              defaultValue={article?.content || ''}
              className={adminMonoInputClass}
            />
          </AdminField>
        </AdminSection>

        <AdminSection
          title="Публикация"
          description="Статус, автор, город, дата выхода и обложка статьи."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <AdminField label="Статус">
              <select
                name="status"
                defaultValue={article?.status || 'draft'}
                className={adminSelectClass}
              >
              {ARTICLE_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="Автор">
            <select
              name="authorId"
              defaultValue={article?.authorId || 'editorial'}
              className={adminInputClass}
            >
              {ARTICLE_AUTHOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </AdminField>
          <AdminField label="City slug">
            <input
              name="citySlug"
              defaultValue={article?.citySlug || ''}
              className={adminInputClass}
            />
          </AdminField>
          <AdminField label="Published at">
            <input
              type="datetime-local"
              name="publishedAt"
              defaultValue={toDatetimeLocalValue(article?.publishedAt)}
              className={adminInputClass}
            />
          </AdminField>
          <AdminField label="Cover image URL">
            <input
              name="coverImageUrl"
              defaultValue={article?.coverImageUrl || ''}
              className={adminInputClass}
            />
          </AdminField>
        </div>
        <div className="mt-3 space-y-2">
          <AdminCheckbox
            name="isFeatured"
            label="В Hero на /blog"
            hint="Только одна статья; включение сбрасывает остальные."
            defaultChecked={Boolean(article?.isFeatured)}
          />
          <AdminCheckbox
            name="isIndexable"
            label="Индексировать"
            hint="Разрешить поисковикам показывать статью в выдаче."
            defaultChecked={Boolean(article?.isIndexable)}
          />
        </div>
        </AdminSection>

        <AdminSection
          title="SEO"
          description="Сниппет для поисковиков и канонический адрес статьи."
        >
          <div className="grid gap-3 md:grid-cols-2">
            <AdminField label="SEO title">
              <input
                name="seoTitle"
                defaultValue={article?.seoTitle || ''}
                className={adminInputClass}
              />
            </AdminField>
            <AdminField label="SEO description">
              <input
                name="seoDescription"
                defaultValue={article?.seoDescription || ''}
                className={adminInputClass}
              />
            </AdminField>
          </div>
          <div className="mt-3">
            <AdminField
              label="Canonical path"
              hint={`Публичный адрес: ${PUBLIC_SITE_BASE.replace(/\/$/, '')}${article?.canonicalPath || (article?.slug ? `/blog/${article.slug}` : '/blog/...')}`}
            >
              <input
                name="canonicalPath"
                defaultValue={article?.canonicalPath || (article?.slug ? `/blog/${article.slug}` : '')}
                className={adminInputClass}
              />
            </AdminField>
          </div>
        </AdminSection>

        <AdminFormActions>
          <AdminButton type="submit" variant="primary" size="md">
            Сохранить
          </AdminButton>
          <AdminButton href="/admin/articles" variant="secondary" size="md">
            К списку
          </AdminButton>
        </AdminFormActions>
      </form>

      {!isNew ? (
        <AdminDangerZone
          title="Архив"
          description="Снимает статью с витрины без удаления. Полное удаление - отдельной кнопкой в списке."
        >
          <form action={archiveAdminArticleAction}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="title" value={article?.title || ''} />
            <input type="hidden" name="slug" value={article?.slug || ''} />
            <input type="hidden" name="excerpt" value={article?.excerpt || ''} />
            <input type="hidden" name="content" value={article?.content || ''} />
            <input type="hidden" name="coverImageUrl" value={article?.coverImageUrl || ''} />
            <input type="hidden" name="citySlug" value={article?.citySlug || ''} />
            <input type="hidden" name="authorId" value={article?.authorId || 'editorial'} />
            <input type="hidden" name="seoTitle" value={article?.seoTitle || ''} />
            <input type="hidden" name="seoDescription" value={article?.seoDescription || ''} />
            <input type="hidden" name="canonicalPath" value={article?.canonicalPath || ''} />
            <input type="hidden" name="publishedAt" value={toDatetimeLocalValue(article?.publishedAt)} />
            {article?.isIndexable ? <input type="hidden" name="isIndexable" value="true" /> : null}
            <AdminButton type="submit" variant="warning">
              Отправить в архив
            </AdminButton>
          </form>
        </AdminDangerZone>
      ) : null}
    </div>
  );
}
