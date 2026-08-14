'use client';

function buildYandexWidgetUrl(lat: number, lng: number): string {
  return `https://yandex.ru/map-widget/v1/?ll=${lng},${lat}&z=16&pt=${lng},${lat}`;
}

export function buildYandexMapsExternalUrl(input: {
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
}): string | null {
  const lat = Number(input.latitude);
  const lng = Number(input.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    return `https://yandex.ru/maps/?pt=${lng},${lat}&z=16&l=map`;
  }
  const address = String(input.address || '').trim();
  if (!address) return null;
  return `https://yandex.ru/maps/?text=${encodeURIComponent(address)}`;
}

export function YandexMapEmbed({
  lat,
  lng,
  title,
  className,
}: {
  lat: number;
  lng: number;
  title: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <iframe
        title={title}
        src={buildYandexWidgetUrl(lat, lng)}
        className="h-full w-full border-0"
        loading="lazy"
        allowFullScreen
      />
    </div>
  );
}
