import type { Metadata } from 'next';
import { Suspense } from 'react';

import { NewYearUxPreview } from './preview.client';
import { buildNewYearPreviewData } from './preview-data';

export const metadata: Metadata = {
  title: { absolute: 'Новый год 2027: мероприятия в России, афиша и билеты | Дайбилет' },
  description: 'Новогодние мероприятия в городах России: афиша, расписание, доступные даты и билеты на зимние праздники.',
  robots: { index: false, follow: false },
};

export default async function NewYearUxPreviewPage() {
  let initialData: Awaited<ReturnType<typeof buildNewYearPreviewData>> | null = null;
  let errorMessage: string | null = null;
  try {
    initialData = await buildNewYearPreviewData();
  } catch {
    errorMessage = 'Не удалось получить события из публичного каталога. Обновите страницу позже.';
  }

  return (
    <Suspense fallback={<main className="min-h-screen bg-[#F7F8F6] p-8 text-sm text-neutral-600">Загружаем предварительный просмотр…</main>}>
      <NewYearUxPreview initialData={initialData} errorMessage={errorMessage} />
    </Suspense>
  );
}
