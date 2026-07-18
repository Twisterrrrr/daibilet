import { Inbox } from 'lucide-react';

import { DataTableShell, PageHeader, StatusBadge } from '@/components/admin/primitives';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { adminData, formatNumber } from '@/data';

export function MappingInboxPage() {
  return (
    <div>
      <PageHeader title="Маппинг" description="Как внешние категории и признаки Ticketscloud / Teplohod.info ложатся в нашу таксономию." />
      <div className="mb-4 grid gap-3 md:grid-cols-3">
        <Card className="border-border p-4">
          <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-md bg-secondary text-muted-foreground">
            <Inbox className="h-4 w-4" />
          </div>
          <div className="text-2xl font-semibold">{formatNumber(adminData.mappingRows.length)}</div>
          <div className="text-xs text-muted-foreground">категории источника</div>
        </Card>
        <Card className="border-border p-4">
          <div className="text-2xl font-semibold">{formatNumber(adminData.mappingRows.filter((row) => row.mode === 'review').length)}</div>
          <div className="text-xs text-muted-foreground">требуют решения</div>
        </Card>
        <Card className="border-border p-4">
          <div className="text-2xl font-semibold">{formatNumber(adminData.mappingRows.filter((row) => row.mode === 'auto').length)}</div>
          <div className="text-xs text-muted-foreground">авто-правила</div>
        </Card>
      </div>
      <DataTableShell columns={['Источник', 'Событий', 'Категория', 'Подкатегория', 'Режим']}>
        {adminData.mappingRows.map((row) => (
          <tr key={row.source} className="border-b border-border last:border-0 hover:bg-secondary/40">
            <td className="px-4 py-3 font-medium">{row.source}</td>
            <td className="px-4 py-3">{formatNumber(row.events)}</td>
            <td className="px-4 py-3">{row.target}</td>
            <td className="px-4 py-3">{row.subcategory}</td>
            <td className="px-4 py-3">
              {row.mode === 'auto' ? <StatusBadge status="live" label="авто" /> : <StatusBadge status="incomplete" label="на проверке" />}
            </td>
          </tr>
        ))}
      </DataTableShell>
    </div>
  );
}
