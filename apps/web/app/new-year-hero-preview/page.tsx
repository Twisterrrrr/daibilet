import type { Metadata } from 'next';
import styles from './preview.module.css';

export const metadata: Metadata = {
  title: { absolute: 'Предпросмотр новогоднего Hero | Дайбилет' },
  robots: { index: false, follow: false },
};

function GoldOrnament() {
  return (
    <svg className={styles.ornament} viewBox="0 0 1440 14" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <pattern id="gold-engraving" width="40" height="14" patternUnits="userSpaceOnUse">
          <path d="M0 7h11l9-6 9 6h11M11 7l9 6 9-6" fill="none" stroke="#e8ca79" strokeWidth=".8" opacity=".82" />
          <circle cx="20" cy="7" r="1.35" fill="#f5dc92" />
        </pattern>
      </defs>
      <path d="M0 1.5h1440M0 12.5h1440" stroke="#e6c66f" strokeWidth="1" opacity=".74" />
      <rect width="1440" height="14" fill="url(#gold-engraving)" />
    </svg>
  );
}

function EngravedSnowflake() {
  return (
    <svg className={styles.snowflake} viewBox="0 0 240 240" fill="none" aria-hidden="true">
      <g stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <path d="M120 20v200M33.4 70l173.2 100M33.4 170 206.6 70" strokeWidth="1.45" />
        <path d="m108 43 12-23 12 23m-24 154 12 23 12-23M53 82 33.4 70l2 25m151 73 20 2-2-20M53 158l-20 12 2-25m151-23 20-2-2 20" strokeWidth="1.1" />
        <path d="m109 52 11 9 11-9m-22 136 11-9 11 9M66 90l2 14 14 2m78 28 2 14 14 2M66 150l2-14 14-2m78-28 2-14 14-2" strokeWidth=".85" />
        <circle cx="120" cy="120" r="8" strokeWidth="1.15" />
        <path d="m114 120 6-6 6 6-6 6-6-6Z" strokeWidth="1" />
      </g>
      <g fill="currentColor">
        <circle cx="120" cy="20" r="2" /><circle cx="33.4" cy="70" r="2" /><circle cx="206.6" cy="170" r="2" />
        <circle cx="33.4" cy="170" r="2" /><circle cx="206.6" cy="70" r="2" /><circle cx="120" cy="220" r="2" />
      </g>
    </svg>
  );
}

function Hero() {
  return (
    <section className={styles.hero} aria-label="Предпросмотр новогоднего заголовочного блока">
      <GoldOrnament />
      <div className={styles.inner}>
        <div className={styles.copy}>
          <div className={styles.kicker}>ЗИМА 2026–2027</div>
          <h1>Новый год 2027 в Москве</h1>
          <p>Ёлки, спектакли, концерты, экскурсии и праздничные программы.<br />Выберите город, дату и цену, чтобы сравнить расписание.</p>
        </div>
        <div className={styles.art}><EngravedSnowflake /></div>
      </div>
    </section>
  );
}

export default function NewYearHeroPreviewPage() {
  return (
    <main className={styles.page}>
      <h1 className={styles.pageTitle}>Новогодний Hero - вариант для обсуждения</h1>
      <section className={styles.desktop} aria-label="Десктопный вариант">
        <h2>Десктоп · 260 px</h2>
        <Hero />
      </section>
      <section className={styles.mobileSection} aria-label="Мобильный вариант">
        <h2>Мобильный · высота по содержимому</h2>
        <div className={styles.phone}><Hero /></div>
      </section>
    </main>
  );
}
