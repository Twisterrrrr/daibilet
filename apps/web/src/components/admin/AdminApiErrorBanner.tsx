export function AdminApiErrorBanner({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div
      role="alert"
      data-testid="admin-api-error-banner"
      className="rounded-lg border-2 border-red-400 bg-red-50 px-4 py-3 text-sm text-red-900"
    >
      <p className="text-base font-semibold">Данные недоступны — показатели ниже недостоверны</p>
      <p className="mt-0.5">
        Live API не отдал ответ. Нули в счётчиках означают «нет данных», а не «нет заказов».
      </p>
      <ul className="mt-1 list-disc pl-5 text-xs">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
