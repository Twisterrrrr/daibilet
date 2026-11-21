import Link from 'next/link';
import type { ReactNode } from 'react';
import { AdminApiErrorBanner } from '@/components/admin/AdminApiErrorBanner';
import { PlaceClassificationFields } from '@/components/admin/PlaceClassificationFields.client';
import { createAdminVenueAction } from '@/server/admin-venue-actions';
import { loadAdminVenueCityOptions } from '@/server/admin-venues-data';

export const dynamic = 'force-dynamic';

const control = 'mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm';

export default async function NewAdminVenuePage() {
  const cities = await loadAdminVenueCityOptions();
  return <div className="mx-auto max-w-4xl space-y-4">
    <Link href="/admin/venues" className="text-sm text-sky-700 hover:underline">← К списку площадок</Link>
    <header><h1 className="text-xl font-semibold text-slate-900">Новая площадка</h1><p className="mt-1 text-sm text-slate-600">Создайте карточку-кандидат с нуля. Она останется без индексации; чек-лист на карточке подскажет, каких данных не хватает для редакционного решения о публикации.</p></header>
    <AdminApiErrorBanner errors={cities.error ? [cities.error] : []}/>
    <form action={createAdminVenueAction} className="space-y-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <section className="grid gap-3 md:grid-cols-2">
        <Field label="Название" required><input name="title" required maxLength={200} className={control}/></Field>
        <Field label="Город"><select name="cityId" defaultValue="" className={control}><option value="">Пока не выбран</option>{cities.rows.map((city) => <option key={city.id} value={city.id}>{city.title}</option>)}</select></Field>
        <Field label="Адрес"><input name="address" maxLength={500} className={control}/></Field>
        <PlaceClassificationFields defaultPlaceType="" defaultPlaceSubtype="" typePlaceholder="Пока не определён" subtypeLabel="Подтип (slug)" />
        <Field label="Широта"><input name="latitude" type="number" step="any" min="-90" max="90" className={control}/></Field>
        <Field label="Долгота"><input name="longitude" type="number" step="any" min="-180" max="180" className={control}/></Field>
        <Field label="Сайт"><input name="websiteUrl" type="url" placeholder="https://" className={control}/></Field>
        <Field label="Телефон"><input name="phone" className={control}/></Field>
        <Field label="Часы работы"><textarea name="openingHours" rows={2} className={control}/></Field>
        <Field label="Метро"><input name="metroStation" className={control}/></Field>
        <Field label="Как найти"><textarea name="wayToFind" rows={2} className={control}/></Field>
        <Field label="Парковка"><textarea name="parkingInfo" rows={2} className={control}/></Field>
        <Field label="Краткое описание"><textarea name="shortDescription" rows={3} className={control}/></Field>
        <Field label="Описание"><textarea name="description" rows={5} className={control}/></Field>
        <Field label="Обложка (URL)"><input name="heroImageUrl" type="url" placeholder="https://" className={control}/></Field>
      </section>
      <p className="rounded-lg border border-sky-100 bg-sky-50 p-3 text-sm text-sky-900">После создания статус будет «Кандидат», индексирование выключено. Базовая карточка может быть доступна в каталоге, но созданная запись сама по себе не включает поиск.</p>
      <button className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white">Создать кандидата</button>
    </form>
  </div>;
}

function Field({ label, required = false, children }: { label: string; required?: boolean; children: ReactNode }) {
  return <label className="block text-xs text-slate-600">{label}{required ? ' *' : null}{children}</label>;
}
