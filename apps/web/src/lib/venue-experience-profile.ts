import { resolvePublicVenueType } from '@/lib/venue-meta';

export type VenueExperienceProfile = {
  id:
    | 'museum'
    | 'theater'
    | 'concert'
    | 'club'
    | 'pier'
    | 'meeting'
    | 'outdoor'
    | 'sport'
    | 'gastro'
    | 'default';
  programTitle: string;
  programTabLabel: string;
  programCtaLabel: string;
  admissionCtaLabel: string;
  featuredProgramTitle: string;
  featuredProgramDescription: string;
  allProgramLabel: string;
  routeSectionTitle: string;
  routeCtaLabel: string;
};

const DEFAULT_PROFILE: VenueExperienceProfile = {
  id: 'default',
  programTitle: 'Расписание и билеты',
  programTabLabel: 'Расписание',
  programCtaLabel: 'Выбрать событие',
  admissionCtaLabel: 'К билетам',
  featuredProgramTitle: 'Ближайшие события',
  featuredProgramDescription: 'События на площадке на ближайшие дни',
  allProgramLabel: 'Всё расписание',
  routeSectionTitle: 'События в этом месте',
  routeCtaLabel: 'Смотреть события',
};

const PROFILES: Record<string, VenueExperienceProfile> = {
  museum: {
    ...DEFAULT_PROFILE,
    id: 'museum',
    programTitle: 'Выставки и события',
    programTabLabel: 'Афиша',
    programCtaLabel: 'Афиша и выставки',
    admissionCtaLabel: 'К входным билетам',
    featuredProgramTitle: 'Сейчас в музее',
    featuredProgramDescription: 'Выставки и события, ради которых стоит запланировать визит',
    allProgramLabel: 'Вся афиша',
  },
  art_space: {
    ...DEFAULT_PROFILE,
    id: 'museum',
    programTitle: 'Выставки и события',
    programTabLabel: 'Афиша',
    programCtaLabel: 'Смотреть программу',
    featuredProgramTitle: 'Сейчас в пространстве',
    featuredProgramDescription: 'Выставки и события на ближайшие дни',
    allProgramLabel: 'Вся программа',
  },
  theater: {
    ...DEFAULT_PROFILE,
    id: 'theater',
    programTitle: 'Афиша театра',
    programTabLabel: 'Афиша',
    programCtaLabel: 'Выбрать спектакль',
    featuredProgramTitle: 'Ближайшие спектакли',
    featuredProgramDescription: 'Постановки на ближайшие даты',
    allProgramLabel: 'Вся афиша',
  },
  concert_hall: {
    ...DEFAULT_PROFILE,
    id: 'concert',
    programTitle: 'Концерты и билеты',
    programTabLabel: 'Афиша',
    programCtaLabel: 'Выбрать концерт',
    featuredProgramTitle: 'Ближайшие концерты',
    featuredProgramDescription: 'Концертная программа на ближайшие даты',
    allProgramLabel: 'Вся афиша',
  },
  bar: {
    ...DEFAULT_PROFILE,
    id: 'club',
    programTitle: 'События и концерты',
    programTabLabel: 'Программа',
    programCtaLabel: 'Смотреть программу',
    featuredProgramTitle: 'Ближайшие события',
    featuredProgramDescription: 'Концерты, вечеринки и специальные события',
    allProgramLabel: 'Вся программа',
  },
  club_bar_restaurant: {
    ...DEFAULT_PROFILE,
    id: 'club',
    programTitle: 'События и концерты',
    programTabLabel: 'Программа',
    programCtaLabel: 'Смотреть программу',
    featuredProgramTitle: 'Ближайшие события',
    featuredProgramDescription: 'Концерты, вечеринки и специальные события',
    allProgramLabel: 'Вся программа',
  },
  pier: {
    ...DEFAULT_PROFILE,
    id: 'pier',
    programTitle: 'Рейсы и билеты',
    programTabLabel: 'Рейсы',
    programCtaLabel: 'Выбрать рейс',
    featuredProgramTitle: 'Ближайшие рейсы',
    featuredProgramDescription: 'Прогулки и экскурсии с отправлением отсюда',
    allProgramLabel: 'Все рейсы',
    routeSectionTitle: 'Рейсы с этого причала',
    routeCtaLabel: 'Выбрать рейс',
  },
  bus: {
    ...DEFAULT_PROFILE,
    id: 'meeting',
    programTitle: 'Экскурсии и отправления',
    programTabLabel: 'Экскурсии',
    programCtaLabel: 'Выбрать экскурсию',
    featuredProgramTitle: 'Ближайшие отправления',
    featuredProgramDescription: 'Экскурсии, которые начинаются в этой точке',
    allProgramLabel: 'Все экскурсии',
    routeSectionTitle: 'Экскурсии отсюда',
    routeCtaLabel: 'Выбрать экскурсию',
  },
  meeting_point: {
    ...DEFAULT_PROFILE,
    id: 'meeting',
    programTitle: 'Экскурсии отсюда',
    programTabLabel: 'Экскурсии',
    programCtaLabel: 'Выбрать экскурсию',
    featuredProgramTitle: 'Ближайшие сборы',
    featuredProgramDescription: 'Экскурсии, которые начинаются в этой точке',
    allProgramLabel: 'Все экскурсии',
    routeSectionTitle: 'Экскурсии отсюда',
    routeCtaLabel: 'Выбрать экскурсию',
  },
  park: {
    ...DEFAULT_PROFILE,
    id: 'outdoor',
    programTitle: 'Экскурсии и прогулки',
    programTabLabel: 'Экскурсии',
    programCtaLabel: 'Посмотреть экскурсии',
    featuredProgramTitle: 'Экскурсии рядом',
    featuredProgramDescription: 'Маршруты, которые включают это место',
    allProgramLabel: 'Все экскурсии',
    routeSectionTitle: 'Экскурсии, которые включают это место',
    routeCtaLabel: 'Посмотреть экскурсии',
  },
  sport_activity_space: {
    ...DEFAULT_PROFILE,
    id: 'sport',
    programTitle: 'События и активности',
    programCtaLabel: 'Выбрать активность',
    featuredProgramDescription: 'События и активности на ближайшие даты',
  },
  gastro: {
    ...DEFAULT_PROFILE,
    id: 'gastro',
    programTitle: 'События и дегустации',
    programTabLabel: 'События',
    programCtaLabel: 'Смотреть события',
    featuredProgramDescription: 'Дегустации и специальные события',
  },
};

const OUTDOOR_ALIASES = new Set(['outdoor_location', 'monument', 'attraction', 'temple']);

export function resolveVenueExperienceProfile(input: {
  type?: string | null;
  name?: string | null;
}): VenueExperienceProfile {
  const publicType = resolvePublicVenueType(input.type, input.name);
  if (OUTDOOR_ALIASES.has(publicType)) return PROFILES.park;
  return PROFILES[publicType] || DEFAULT_PROFILE;
}
