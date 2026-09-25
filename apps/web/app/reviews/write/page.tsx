import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

import ReviewWriteClient from '@/components/ReviewWriteClient';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = {
  title: 'Оставить отзыв',
  description: 'Расскажите о посещении события на Дайбилет.',
  robots: { index: false, follow: false },
};

export default function ReviewWritePage() {
  return (
    <SiteLayout>
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
          </div>
        }
      >
        <ReviewWriteClient />
      </Suspense>
    </SiteLayout>
  );
}
