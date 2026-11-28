import type { Metadata } from 'next';
import { NewYearLandingPage } from './landing-page';

export const metadata: Metadata = {
  title: { absolute: 'Новый год 2027: мероприятия в России, афиша и билеты | Дайбилет' },
  description: 'Новогодние мероприятия в городах России: афиша, расписание, доступные даты и билеты на зимние праздники.',
  robots: { index: false, follow: false },
};

export default async function NewYearUxPreviewPage() {
  return <NewYearLandingPage />;
}
