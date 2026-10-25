export function AdminAccessDenied({ section }: { section: string }) {
  return (
    <section role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-rose-950">
      <h2 className="text-base font-semibold">Нет доступа к разделу</h2>
      <p className="mt-1 text-sm">Для просмотра раздела «{section}» у вашей учётной записи нет нужного права.</p>
    </section>
  );
}
