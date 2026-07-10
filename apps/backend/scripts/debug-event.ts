import { getPublicCatalogSessions } from '../src/public-catalog.dto.js';
import { buildPublicEventDto, clearPublicEventDtoCache } from '../src/public-event.dto.js';

const slug = 'progulka-po-moskve-reke-na-dizainerskom-teplohode-volna-ot-kitai-goroda-867';
await getPublicCatalogSessions(true);
clearPublicEventDtoCache();
const typed = await buildPublicEventDto(slug, true);
console.log('result', typed?.event?.id ?? null);
