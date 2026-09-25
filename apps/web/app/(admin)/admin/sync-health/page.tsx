import { redirect } from 'next/navigation';

/** Vite alias: sync-health → Sources. */
export default function AdminSyncHealthRedirectPage() {
  redirect('/admin/sources');
}
