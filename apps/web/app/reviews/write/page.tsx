import type { Metadata } from 'next';

import ReviewWriteClient from '@/components/ReviewWriteClient';

export const metadata: Metadata = {
  title: 'Оставить отзыв',
  description: 'Расскажите о посещении события на Дайбилет.',
  robots: { index: false, follow: false },
};

export default function ReviewWritePage() {
  return <ReviewWriteClient />;
}
