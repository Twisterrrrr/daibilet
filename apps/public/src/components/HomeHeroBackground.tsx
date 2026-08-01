import * as React from 'react';

/** Тематические кадры hero: друзья на городской экскурсии / групповое селфи (Unsplash-style art). */
const HERO_IMAGES = {
  /** Горизонтальный кадр: планшет, десктоп, ультраширокий */
  landscape: '/images/hero/home-hero-friends-selfie.jpg',
  /** Вертикальный кадр: мобильные экраны */
  portrait: '/images/hero/home-hero-friends-selfie-mobile.jpg',
} as const;

export function HomeHeroBackground() {
  const [loaded, setLoaded] = React.useState(false);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      <picture>
        <source media="(min-width: 768px)" srcSet={HERO_IMAGES.landscape} />
        <img
          src={HERO_IMAGES.portrait}
          alt=""
          width={1200}
          height={900}
          decoding="async"
          fetchPriority="high"
          onLoad={() => setLoaded(true)}
          className={`h-full w-full object-cover transition-opacity duration-700 md:object-[58%_42%] lg:object-[52%_40%] 2xl:object-[48%_38%] ${
            loaded ? 'opacity-100' : 'opacity-0'
          }`}
        />
      </picture>

      {/* Лёгкий оверлей: navy (не slate-black) + brand blue tint; текст читается за счёт нижнего градиента */}
      <div className="absolute inset-0 bg-[#122868]/20" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a174b]/75 via-[#122868]/35 to-[#122868]/10" />
      <div className="absolute inset-0 bg-gradient-to-br from-sky-900/25 via-transparent to-primary-900/20" />
    </div>
  );
}
