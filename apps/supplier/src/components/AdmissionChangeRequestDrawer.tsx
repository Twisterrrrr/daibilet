import * as React from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import type { AdmissionProductDto } from '@daibilet/contracts/admission';
import type {
  SupplierPortalAdmissionChangeRequestCreateDto,
  SupplierPortalChangeRequestCreateResultDto,
  SupplierPortalProfileDto,
} from '@daibilet/contracts/supplier';
import { supplierPost } from '@/lib/api';
import {
  admissionOffersToPayload,
  createAdmissionOfferFormValue,
  type AdmissionOfferFormValue,
} from '@/lib/admission-offers';

export function AdmissionOffersEditor({
  offers,
  onChange,
  disabled = false,
}: {
  offers: AdmissionOfferFormValue[];
  onChange: (offers: AdmissionOfferFormValue[]) => void;
  disabled?: boolean;
}) {
  function update(key: string, patch: Partial<AdmissionOfferFormValue>) {
    onChange(offers.map((offer) => (offer.key === key ? { ...offer, ...patch } : offer)));
  }

  return (
    <fieldset className="offer-editor span-2" disabled={disabled}>
      <div className="offer-editor-heading">
        <div>
          <strong>Категории билетов</strong>
          <small>Покупатель выбирает одну из активных категорий.</small>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={() => onChange([...offers, createAdmissionOfferFormValue({ title: 'Новая категория', priceRub: '' })])}
        >
          <Plus size={16} /> Добавить категорию
        </button>
      </div>
      <div className="offer-editor-list">
        {offers.map((offer, index) => (
          <div className="offer-editor-row" key={offer.key}>
            <label className="form-field">
              <span>Название</span>
              <input value={offer.title} onChange={(event) => update(offer.key, { title: event.target.value })} required />
            </label>
            <label className="form-field">
              <span>Цена, ₽</span>
              <input type="number" min="100" step="1" value={offer.priceRub} onChange={(event) => update(offer.key, { priceRub: event.target.value })} required={offer.active} />
            </label>
            <label className="form-field">
              <span>Старая цена, ₽</span>
              <input type="number" min="0" step="1" value={offer.oldPriceRub} onChange={(event) => update(offer.key, { oldPriceRub: event.target.value })} placeholder="не указана" />
            </label>
            <label className="form-field">
              <span>Лимит категории</span>
              <input type="number" min="1" step="1" value={offer.capacityTotal} onChange={(event) => update(offer.key, { capacityTotal: event.target.value })} placeholder="общий лимит" />
            </label>
            <label className="checkbox-field compact-checkbox">
              <input type="checkbox" checked={offer.active} onChange={(event) => update(offer.key, { active: event.target.checked })} />
              <span>Продавать</span>
            </label>
            <button
              type="button"
              className="icon-button danger-icon"
              onClick={() => onChange(offers.filter((item) => item.key !== offer.key))}
              disabled={offers.length === 1}
              aria-label={`Удалить категорию ${index + 1}`}
              title="Удалить категорию"
            >
              <Trash2 size={17} />
            </button>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export function AdmissionChangeRequestDrawer({
  product,
  profile,
  supplierKey,
  onClose,
  onCreated,
}: {
  product: AdmissionProductDto;
  profile: SupplierPortalProfileDto | null;
  supplierKey: string;
  onClose: () => void;
  onCreated: (result: SupplierPortalChangeRequestCreateResultDto) => void;
}) {
  const closeButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [form, setForm] = React.useState(() => ({
    title: product.title,
    shortDescription: product.shortDescription || '',
    venueId: product.venue.id,
    type: product.type,
    validityMode: product.validityMode,
    validFrom: toDateTimeLocal(product.validFrom),
    validTo: toDateTimeLocal(product.validTo),
    validDaysAfterPurchase: product.validDaysAfterPurchase ? String(product.validDaysAfterPurchase) : '30',
    ticketsVacant: product.ticketsVacant == null ? '' : String(product.ticketsVacant),
    summary: '',
  }));
  const [offers, setOffers] = React.useState<AdmissionOfferFormValue[]>(() => {
    const activeOffers = product.offers.filter((offer) => offer.active);
    return (activeOffers.length ? activeOffers : product.offers).map((offer) => createAdmissionOfferFormValue({
      title: offer.title || 'Билет',
      priceRub: offer.priceRub == null ? '' : String(offer.priceRub),
      oldPriceRub: offer.oldPriceRub == null ? '' : String(offer.oldPriceRub),
      capacityTotal: offer.capacityTotal == null ? '' : String(offer.capacityTotal),
      active: offer.active,
    }));
  });

  React.useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [busy, onClose]);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!offers.length || !offers.some((offer) => offer.active)) {
      setError('Оставьте хотя бы одну активную категорию билета.');
      return;
    }
    setBusy(true);
    try {
      const payload: SupplierPortalAdmissionChangeRequestCreateDto = {
        admissionProductId: product.id,
        title: `Изменить входной билет: ${product.title}`,
        summary: form.summary.trim() || null,
        admissionProduct: {
          title: form.title,
          shortDescription: form.shortDescription.trim() || null,
          venueId: form.venueId,
          type: form.type,
          validityMode: form.validityMode,
          validFrom: form.validityMode === 'FIXED_WINDOW' && form.validFrom ? new Date(form.validFrom).toISOString() : null,
          validTo: form.validityMode === 'FIXED_WINDOW' && form.validTo ? new Date(form.validTo).toISOString() : null,
          validDaysAfterPurchase: form.validityMode === 'VALID_DAYS_AFTER_PURCHASE' ? Number(form.validDaysAfterPurchase || 0) : null,
          ticketsVacant: form.ticketsVacant ? Number(form.ticketsVacant) : null,
        },
        offers: admissionOffersToPayload(offers),
      };
      const result = await supplierPost<SupplierPortalChangeRequestCreateResultDto>(
        '/api/supplier/change-requests/admissions',
        payload,
        undefined,
        supplierKey,
      );
      onCreated(result);
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : String(requestError));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="order-drawer-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <aside className="order-drawer admission-editor-drawer" role="dialog" aria-modal="true" aria-labelledby="admission-editor-title">
        <header className="order-drawer-header">
          <div>
            <span>Заявка на изменение</span>
            <h2 id="admission-editor-title">{product.title}</h2>
          </div>
          <button ref={closeButtonRef} type="button" className="icon-button" onClick={onClose} disabled={busy} aria-label="Закрыть редактор" title="Закрыть">
            <X size={18} />
          </button>
        </header>
        <form className="settings-form admission-editor-form" onSubmit={(event) => void submit(event)}>
          <div className="moderation-note span-2">
            <strong>Изменения попадут администратору</strong>
            <span>Текущая карточка продолжит продаваться без изменений, пока заявка не будет проверена и применена.</span>
          </div>
          {error ? <div className="form-error span-2">{error}</div> : null}
          <label className="form-field span-2">
            <span>Название</span>
            <input value={form.title} onChange={(event) => update('title', event.target.value)} required />
          </label>
          <label className="form-field span-2">
            <span>Короткое описание</span>
            <textarea value={form.shortDescription} onChange={(event) => update('shortDescription', event.target.value)} rows={3} placeholder="Что входит и кому подходит билет" />
          </label>
          <label className="form-field">
            <span>Площадка</span>
            <select value={form.venueId} onChange={(event) => update('venueId', event.target.value)} required>
              {(profile?.venues || [{ id: product.venue.id, title: product.venue.title }]).map((venue) => (
                <option key={venue.id} value={venue.id}>{venue.title}</option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Тип</span>
            <select value={form.type} onChange={(event) => update('type', event.target.value)}>
              <option value="MUSEUM_ENTRY">Музей</option>
              <option value="GALLERY_ENTRY">Галерея</option>
              <option value="ART_SPACE_ENTRY">Арт-пространство</option>
              <option value="EXHIBITION_ENTRY">Выставка</option>
              <option value="OBSERVATION_ENTRY">Смотровая площадка</option>
              <option value="ATTRACTION_ENTRY">Аттракцион</option>
              <option value="ZOO_ENTRY">Зоопарк</option>
              <option value="AQUARIUM_ENTRY">Океанариум</option>
              <option value="OTHER">Другое</option>
            </select>
          </label>
          <label className="form-field span-2">
            <span>Как действует билет</span>
            <select value={form.validityMode} onChange={(event) => update('validityMode', event.target.value)}>
              <option value="OPEN_DATE">Открытая дата</option>
              <option value="VALID_DAYS_AFTER_PURCHASE">Несколько дней после покупки</option>
              <option value="FIXED_WINDOW">Фиксированный период</option>
            </select>
          </label>
          {form.validityMode === 'VALID_DAYS_AFTER_PURCHASE' ? (
            <label className="form-field span-2">
              <span>Дней после покупки</span>
              <input type="number" min="1" max="3660" value={form.validDaysAfterPurchase} onChange={(event) => update('validDaysAfterPurchase', event.target.value)} required />
            </label>
          ) : null}
          {form.validityMode === 'FIXED_WINDOW' ? (
            <>
              <label className="form-field"><span>Действует с</span><input type="datetime-local" value={form.validFrom} onChange={(event) => update('validFrom', event.target.value)} required /></label>
              <label className="form-field"><span>Действует до</span><input type="datetime-local" value={form.validTo} onChange={(event) => update('validTo', event.target.value)} required /></label>
            </>
          ) : null}
          <label className="form-field span-2">
            <span>Общий остаток билетов</span>
            <input type="number" min="0" step="1" value={form.ticketsVacant} onChange={(event) => update('ticketsVacant', event.target.value)} placeholder="без ограничения" />
          </label>
          <AdmissionOffersEditor offers={offers} onChange={setOffers} disabled={busy} />
          <label className="form-field span-2">
            <span>Комментарий администратору</span>
            <textarea value={form.summary} onChange={(event) => update('summary', event.target.value)} rows={2} placeholder="Что изменилось и что важно проверить" />
          </label>
          <div className="form-actions sticky-form-actions span-2">
            <button type="button" className="secondary-button" onClick={onClose} disabled={busy}>Отмена</button>
            <button type="submit" className="primary-button" disabled={busy}>{busy ? 'Отправляем...' : 'Отправить на проверку'}</button>
          </div>
        </form>
      </aside>
    </div>
  );
}

function toDateTimeLocal(value: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
