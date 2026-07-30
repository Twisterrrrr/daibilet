export type SupplierIntegrationMode =
  | 'IMPORTED_TICKETING_SYSTEM'
  | 'INTERNAL_SALES'
  | 'API_SYNC'
  | string;

export interface SupplierIntegrationPolicy {
  mode: SupplierIntegrationMode;
  catalogOwnership: 'source' | 'daibilet' | 'partner_api';
  supplierCatalogAccess: 'read_only' | 'editable' | 'api_configurable';
  canSupplierEditEvents: boolean;
  canSupplierManageAdmissions: boolean;
  canConfigureApiRoutes: boolean;
}

export function resolveSupplierIntegrationPolicy(mode: SupplierIntegrationMode): SupplierIntegrationPolicy {
  switch (mode) {
    case 'INTERNAL_SALES':
      return {
        mode,
        catalogOwnership: 'daibilet',
        supplierCatalogAccess: 'editable',
        canSupplierEditEvents: true,
        canSupplierManageAdmissions: true,
        canConfigureApiRoutes: false,
      };
    case 'API_SYNC':
      return {
        mode,
        catalogOwnership: 'partner_api',
        supplierCatalogAccess: 'api_configurable',
        canSupplierEditEvents: false,
        canSupplierManageAdmissions: false,
        canConfigureApiRoutes: true,
      };
    case 'IMPORTED_TICKETING_SYSTEM':
    default:
      return {
        mode: 'IMPORTED_TICKETING_SYSTEM',
        catalogOwnership: 'source',
        supplierCatalogAccess: 'read_only',
        canSupplierEditEvents: false,
        canSupplierManageAdmissions: false,
        canConfigureApiRoutes: false,
      };
  }
}
