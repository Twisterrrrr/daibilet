import { prisma } from '@daibilet/db';
import { z } from 'zod';
import { sendJson } from './http.js';
import type { TypedRouteHandler } from './validated-handler.js';
import { parseJsonBody } from './validation.js';

const createVenueSchema = z.object({
  title: z.string().trim().min(2).max(300),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(150),
  cityId: z.string().trim().min(1).max(128),
  address: z.string().trim().max(500).nullable().optional(),
  kind: z.enum(['VENUE', 'MUSEUM_ART_SPACE', 'THEATER', 'CONCERT_HALL', 'CLUB_BAR_RESTAURANT', 'PIER', 'MEETING_POINT', 'OUTDOOR_LOCATION', 'SPORT_ACTIVITY_SPACE', 'ATTRACTION', 'ONLINE', 'OTHER']),
}).strict();

export const createAdminVenueRouteHandler: TypedRouteHandler = async (context) => {
  if (context.method !== 'POST' || context.pathname !== '/api/admin/venues') return false;
  const input = await parseJsonBody(createVenueSchema, context.request);
  const city = await prisma.city.findUnique({ where: { id: input.cityId }, select: { id: true } });
  if (!city) throw Object.assign(new Error('city_not_found'), { statusCode: 404 });
  try {
    const venue = await prisma.venue.create({
      data: {
        title: input.title,
        slug: input.slug,
        cityId: city.id,
        address: input.address ?? null,
        kind: input.kind,
        pageStatus: 'NONE',
        isIndexable: false,
      },
      select: { id: true, slug: true, title: true, cityId: true, pageStatus: true },
    });
    sendJson(context.response, venue, { statusCode: 201 });
    return true;
  } catch (error) {
    if ((error as { code?: string }).code === 'P2002') {
      throw Object.assign(new Error('venue_slug_exists'), { statusCode: 409 });
    }
    throw error;
  }
};
