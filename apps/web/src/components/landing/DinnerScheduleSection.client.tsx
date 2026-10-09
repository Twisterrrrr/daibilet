'use client';

import * as React from 'react';
import { Clock, MapPin, Ship, Star, Users } from 'lucide-react';
import { LandingPurchaseButton } from '@/components/landing/LandingPurchaseButton.client';
import { LandingEmptyState } from '@/components/landing/LandingEmptyState.client';
import { LandingCardBadgeRow } from '@/components/landing/LandingCardBadgeRow';
import { formatMoneyRange } from '@/lib/format';
import { resolveSessionTime } from '@/lib/datetime';
import { eventHref } from '@/lib/routes';
import { deriveLandingCardBadges } from '@/lib/landing-card-badges';
import type { PublicSessionDto } from '@daibilet/contracts/public';

export type DinnerEventGroup = {
  key: string; title: string; sessions: PublicSessionDto[];
  representative: PublicSessionDto; priceFrom: number | null;
  priceTo: number | null; venue: string | null; vacant: number | null;
};