import type { Metadata } from 'next';
import { Suspense } from 'react';

import { VerifyEmailPageView } from '@/components/VerifyEmailPage.client';
import { SiteLayout } from '@/components/SiteLayout';

export const metadata: Metadata = { title: 'Подтверждение email' };

export default function VerifyEmailPage() {
  return <SiteLayout><Suspense fallback={<div className="container-page py-16">Загрузка...</div>}><VerifyEmailPageView /></Suspense></SiteLayout>;
}
