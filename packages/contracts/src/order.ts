import type { SourceCode } from './common.js';

export type ExternalOrderStatus =
  | 'created'
  | 'paid'
  | 'confirmed'
  | 'cancelled'
  | 'refunded'
  | 'unknown'
  | string;

export type ExternalTicketStatus =
  | 'active'
  | 'used'
  | 'cancelled'
  | 'refunded'
  | 'unknown'
  | string;

export interface ExternalBuyerDto {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

export interface ExternalTicketDto {
  id: string;
  sourceTicketId?: string | null;
  ticketNumber?: string | null;
  status: ExternalTicketStatus;
  title?: string | null;
  priceRub?: number | null;
  holderName?: string | null;
}

export interface ExternalOrderRowDto {
  id: string;
  publicCode?: string | null;
  shortCode?: string | null;
  sourceCode: SourceCode;
  sourceLabel?: string | null;
  sourceOrderId?: string | null;
  status: ExternalOrderStatus;
  eventId?: string | null;
  eventTitle?: string | null;
  eventSlug?: string | null;
  startsAt?: string | null;
  totalRub?: number | null;
  buyer?: ExternalBuyerDto | null;
  tickets?: ExternalTicketDto[];
  createdAt?: string | null;
  updatedAt?: string | null;
  attentionCodes?: string[];
}

export interface AdminOrdersListDto {
  generatedAt: string;
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
  items: ExternalOrderRowDto[];
}

export interface AdminOrderDetailDto extends ExternalOrderRowDto {
  raw?: Record<string, unknown> | null;
  eventCandidates?: Array<{
    id: string;
    title: string;
    city?: string | null;
    venue?: string | null;
    startsAt?: string | null;
    score?: number;
  }>;
}

export interface PublicBuyerOrdersDto {
  generatedAt: string;
  lookup: string;
  items: ExternalOrderRowDto[];
}

