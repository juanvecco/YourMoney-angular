export type OpenFinanceSourceType = 'public' | 'simulated' | 'future-consent';
export type OpenFinanceSourceStatus = 'available' | 'unavailable' | 'checking' | 'failed' | 'not-configured';
export type OpenFinanceMode = 'preview-only';
export type OpenFinanceDirection = 'inflow' | 'outflow';
export type OpenFinanceSuggestedFinancialType = 'receita' | 'despesa' | 'unknown';
export type OpenFinanceImportStatus = 'preview-only';

export interface OpenFinanceReadiness {
  mode: OpenFinanceMode;
  realDataEnabled: boolean;
  summary: string;
  nextSteps: string[];
  lastUpdatedAt?: string | null;
}

export interface OpenFinanceSource {
  id: string;
  name: string;
  type: OpenFinanceSourceType;
  status: OpenFinanceSourceStatus;
  lastCheckedAt?: string | null;
  message: string;
  supportsTransactionPreview: boolean;
}

export interface OpenFinanceSourcesResponse {
  readiness: OpenFinanceReadiness;
  sources: OpenFinanceSource[];
}

export interface OpenFinanceTransactionPreview {
  id: string;
  sourceId: string;
  externalReference?: string | null;
  transactionDate: string;
  description: string;
  amount: number;
  direction: OpenFinanceDirection;
  suggestedFinancialType: OpenFinanceSuggestedFinancialType;
  duplicateRisk: boolean;
  duplicateReason?: string | null;
  importStatus: OpenFinanceImportStatus;
}

export interface OpenFinanceTransactionPreviewResponse {
  sourceId?: string | null;
  mode: OpenFinanceMode;
  items: OpenFinanceTransactionPreview[];
}
