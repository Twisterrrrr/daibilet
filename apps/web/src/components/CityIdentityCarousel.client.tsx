'use client';

import { CityHubSectionHeading, HUB_SECTION_GAP } from '@/components/CityHubSectionHeading';
import { HubCarouselChrome } from '@/components/HubCarouselChrome.client';
import { IMAGE_SIZES, SafeImage } from '@/components/SafeImage.client';
import { useHubCardRail } from '@/hooks/useHubCardRail';
import {
  cityIdentitySlides,
  focusFromIdentitySlide,
  resolveCityLocalFlavor,
  type CityIdentitySlide,
  type CityPlaceFocus,
} from '@/lib/city-hub-local-flavor';
import { isLabelCardVenueStub, resolveVenueHeroImage } from '@/lib/city-place-images';

/** Prefer real photo: skip label-card gradient stubs, fall back to editorial place cover. */
function resolveIdentitySlideImage(slide: CityIdentitySlide): string {
  const primary = String(slide.imageSrc || '').trim();
  if (primary && !isLabelCardVenueStub(primary)) return primary;
  for (const slug of slide.slugs) {
    const editorial = resolveVenueHeroImage(slug, null);
    if (editorial && !isLabelCardVenueStub(editorial)) return editorial;
  }
  return primary;
}

type Props = {
  citySlug: string;
  editorial?: boolean;
  /** Sticky-tab / hash target. Perm: «Зачем ехать» lands on this carousel. */
  sectionId?: string;
  onSelect: (focus: CityPlaceFocus) => void;
};

export function CityIdentityCarousel({ citySlug, editorial = false, sectionId, onSelect }: Props) {
  const slides = cityIdentitySlides(citySlug);
  const flavor = resolveCityLocalFlavor(citySlug);
  const heading = flavor?.identityHeading || 'Чем уникален город';
  const lead = flavor?.identityLead?.trim() || '';
  const { scrollerRef, canPrev, canNext, onPrev, onNext } = useHubCardRail(
    '[data-identity-slide]',
    `${citySlug}:${slides.length}`,
  );

  if (!slides.length) return null;

  return (
    <section
      id={sectionId}
      className={`${HUB_SECTION_GAP} ${sectionId ? 'scroll-mt-[calc(var(--site-header-height)+3.25rem)]' : ''}`.trim()}
      data-city-identity-carousel
    >
      <CityHubSectionHeading title={heading} description={lead} editorial={editorial} />
      <HubCarouselChrome
        className="mt-5"
        scrollerRef={scrollerRef}
        trackClassName="flex snap-x snap-mandatory gap-4 overflow-x-auto overscroll-x-contain py-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden [&::-webkit-scrollbar]:h-0"
        aria-label={heading}
        showArrows={slides.length > 1}
        canPrev={canPrev}
        canNext={canNext}
        onPrev={onPrev}
        onNext={onNext}
        prevLabel="Предыдущий слайд"
        nextLabel="Следующий слайд"
      >
        {slides.map((slide) => (
          <article
            key={slide.id}
            data-identity-slide={slide.id}
            className={
              editorial
                ? 'w-[min(100%,19.5rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_28px_-10px_hsl(221_83%_53%_/_0.28)]'
                : 'w-[min(100%,19.5rem)] shrink-0 snap-start overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_rgba(15,23,42,0.06)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_10px_28px_-10px_hsl(221_83%_53%_/_0.28)]'
            }
          >
            <button
              type="button"
              className="block w-full text-left"
              onClick={() => onSelect(focusFromIdentitySlide(slide))}
            >
              <div className="relative aspect-[16/10] overflow-hidden bg-slate-100">
                <SafeImage
                  src={resolveIdentitySlideImage(slide)}
                  alt={slide.imageAlt}
                  fill
                  sizes={IMAGE_SIZES.cityCard}
                  className="object-cover"
                />
                {slide.badge ? (
                  <span className="absolute left-3 top-3 inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm">
                    {slide.badge}
                  </span>
                ) : null}
              </div>
              <div className="px-4 py-4">
                <h3 className={`text-base font-bold leading-snug ${editorial ? 'text-zinc-950' : 'text-slate-950'}`}>
                  {slide.title}
                </h3>
                <p className={`mt-2 text-sm leading-6 ${editorial ? 'text-zinc-600' : 'text-slate-600'}`}>
                  {slide.text}
                </p>
              </div>
            </button>
          </article>
        ))}
      </HubCarouselChrome>
    </section>
  );
}
