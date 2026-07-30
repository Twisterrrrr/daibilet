import type {
  SupplierIntegrationCapabilitiesDto,
  SupplierIntegrationCapabilityKey,
  SupplierIntegrationProviderClass,
} from '@daibilet/contracts/supplier-integration';

const CAPABILITY_KEYS: SupplierIntegrationCapabilityKey[] = [
  'catalogRead',
  'eventsRead',
  'eventsWrite',
  'venuesRead',
  'admissionsRead',
  'admissionsWrite',
  'sessionsRead',
  'sessionsWrite',
  'offersRead',
  'offersWrite',
  'ordersRead',
  'ordersWrite',
  'webhooks',
  'widgetPurchase',
  'internalCheckout',
];

type CapabilityMap = SupplierIntegrationCapabilitiesDto['capabilities'];

const PROVIDER_PRESETS: Record<string, {
  providerClass: SupplierIntegrationProviderClass;
  capabilities: Partial<CapabilityMap>;
}> = {
  MANUAL: {
    providerClass: 'MANUAL',
    capabilities: {
      eventsRead: true,
      eventsWrite: true,
      venuesRead: true,
      admissionsRead: true,
      admissionsWrite: true,
      sessionsRead: true,
      sessionsWrite: true,
      offersRead: true,
      offersWrite: true,
      ordersRead: true,
      internalCheckout: true,
    },
  },
  TICKETSCLOUD: {
    providerClass: 'IMPORTED_TICKETING_SYSTEM',
    capabilities: {
      catalogRead: true,
      eventsRead: true,
      venuesRead: true,
      sessionsRead: true,
      offersRead: true,
      ordersRead: true,
      widgetPurchase: true,
    },
  },
  TEPLOHOD: {
    providerClass: 'IMPORTED_TICKETING_SYSTEM',
    capabilities: {
      catalogRead: true,
      eventsRead: true,
      venuesRead: true,
      sessionsRead: true,
      offersRead: true,
      ordersRead: true,
      widgetPurchase: true,
    },
  },
  CUSTOM_API: {
    providerClass: 'API_SYNC',
    capabilities: {
      catalogRead: true,
      eventsRead: true,
      venuesRead: true,
      admissionsRead: true,
      sessionsRead: true,
      offersRead: true,
      ordersRead: true,
      webhooks: true,
    },
  },
};

export function resolveSupplierIntegrationCapabilities(providerCode: string | null | undefined): SupplierIntegrationCapabilitiesDto {
  const normalized = normalizeProviderCode(providerCode);
  const preset = PROVIDER_PRESETS[normalized] || {
    providerClass: 'CUSTOM_PARTNER' as const,
    capabilities: {},
  };
  return {
    providerCode: normalized,
    providerClass: preset.providerClass,
    capabilities: mergeCapabilities(preset.capabilities),
  };
}

export function mergeCapabilities(overrides: Partial<CapabilityMap> | null | undefined): CapabilityMap {
  const result = Object.fromEntries(CAPABILITY_KEYS.map((key) => [key, false])) as CapabilityMap;
  for (const [key, value] of Object.entries(overrides || {})) {
    if (!CAPABILITY_KEYS.includes(key as SupplierIntegrationCapabilityKey)) continue;
    result[key as SupplierIntegrationCapabilityKey] = Boolean(value);
  }
  return result;
}

function normalizeProviderCode(value: string | null | undefined): string {
  const normalized = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9_]+/g, '_');
  return normalized || 'CUSTOM_PARTNER';
}
