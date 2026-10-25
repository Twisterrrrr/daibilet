export type SupplierIntegrationProviderClass =
  | 'MANUAL'
  | 'IMPORTED_TICKETING_SYSTEM'
  | 'API_SYNC'
  | 'CUSTOM_PARTNER';

export type SupplierIntegrationCapabilityKey =
  | 'catalogRead'
  | 'eventsRead'
  | 'eventsWrite'
  | 'venuesRead'
  | 'admissionsRead'
  | 'admissionsWrite'
  | 'sessionsRead'
  | 'sessionsWrite'
  | 'offersRead'
  | 'offersWrite'
  | 'ordersRead'
  | 'ordersWrite'
  | 'webhooks'
  | 'widgetPurchase'
  | 'internalCheckout';

export type SupplierIntegrationStatus = 'DRAFT' | 'ACTIVE' | 'PAUSED' | 'ERROR' | 'ARCHIVED';

export interface SupplierIntegrationCapabilitiesDto {
  providerCode: string;
  providerClass: SupplierIntegrationProviderClass;
  capabilities: Record<SupplierIntegrationCapabilityKey, boolean>;
}

export interface SupplierIntegrationDto {
  id: string;
  supplierId: string;
  providerCode: string;
  title: string;
  status: SupplierIntegrationStatus | string;
  sourceCode: string | null;
  baseUrl: string | null;
  capabilities: SupplierIntegrationCapabilitiesDto['capabilities'];
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  consecutiveErrors: number;
  createdAt: string;
  updatedAt: string;
}
