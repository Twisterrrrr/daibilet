import { AdminArticleEditor } from '@/components/admin/AdminArticleEditor';

export const dynamic = 'force-dynamic';

export default function AdminArticleCreatePage() {
  return <AdminArticleEditor mode="create" />;
}
