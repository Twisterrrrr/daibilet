export function AdminApiErrorBanner({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <p className="font-medium">Live API недоступен или вернул ошибку</p>
      <ul className="mt-1 list-disc pl-5 text-xs">
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
