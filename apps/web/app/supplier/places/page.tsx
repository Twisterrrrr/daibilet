import type { Metadata } from 'next';
import { SiteLayout } from '@/components/SiteLayout';
import { SupplierPlacesWorkbench } from '@/components/supplier/SupplierPlacesWorkbench.client';

export const metadata: Metadata = { title: 'Места поставщика', robots: { index: false, follow: false } };

export default function SupplierPlacesPage() {
  return <SiteLayout footerVariant="compact"><div><SupplierPlacesWorkbench /></div></SiteLayout>;
}
