import {
  Bike,
  Bus,
  Landmark,
  Mic2,
  Music2,
  Ship,
  Sparkles,
  Tent,
  Theater,
  Ticket,
  type LucideIcon,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Экскурсии: Bus,
  'Музеи и арт': Landmark,
  Музеи: Landmark,
  Залы: Landmark,
  Мероприятия: Ticket,
  Развлечения: Sparkles,
  'Активный отдых': Bike,
  Речные: Ship,
  'Речные прогулки': Ship,
  Катера: Ship,
  Концерты: Music2,
  Шоу: Mic2,
  Выставки: Landmark,
  Театры: Theater,
  Детям: Sparkles,
  'Для детей': Sparkles,
  Туры: Tent,
};

export function CategoryTabIcon({
  name,
  className = 'h-3.5 w-3.5',
}: {
  name: string;
  className?: string;
}) {
  const Icon = CATEGORY_ICONS[String(name || '').trim()] || Sparkles;
  return <Icon aria-hidden className={`h-3.5 w-3.5 shrink-0 ${className}`.trim()} />;
}
