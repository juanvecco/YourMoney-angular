export interface PluggyConnectToken {
  accessToken: string;
  expiresAt: string;
  connectionId?: string | null;
}

export interface PluggyCredentialStatus {
  configured: boolean;
  source: 'none' | 'database' | 'server';
  clientIdHint: string | null;
  updatedAt: string | null;
  canSave: boolean;
}

export interface PluggyConnection {
  id: string;
  institutionName: string;
  status: string;
  isSandbox: boolean;
  lastUpdatedAt: string | null;
  consentExpiresAt: string | null;
  connectedAt: string;
}

export interface PluggyAccount {
  connectionId: string;
  institutionName: string;
  accountId: string;
  name: string;
  type: string;
  number: string | null;
  balance: number | null;
  currencyCode: string;
  lastUpdatedAt: string | null;
}

export interface PluggyBalanceGroup {
  currencyCode: string;
  accountType: 'BANK' | 'CREDIT' | 'UNKNOWN' | string;
  balance: number;
  accountCount: number;
}

export interface PluggyOverview {
  generatedAt: string;
  sourceUpdatedAt: string | null;
  accounts: PluggyAccount[];
  balancesByCurrencyAndType: PluggyBalanceGroup[];
  transactions: PluggyTransactionPreview[];
}

export interface PluggyOverviewFilter {
  connectionId?: string;
  accountId?: string;
  from?: string;
  to?: string;
}

export interface PluggyDuplicateCandidate {
  recordType: 'expense' | 'revenue';
  recordId: string;
  description: string;
  date: string;
  amount: number;
  reason: string;
}

export interface PluggyTransactionPreview {
  transactionId: string;
  connectionId: string;
  accountId: string;
  institutionName: string;
  accountName: string;
  date: string;
  description: string;
  amount: number;
  currencyCode: string;
  amountInAccountCurrency: number | null;
  accountCurrencyCode: string;
  direction: 'CREDIT' | 'DEBIT' | 'UNKNOWN';
  operationType: string | null;
  status: string;
  previewOnly: true;
  registrationStatus: 'PENDING' | 'REGISTERED';
  registeredRecordType: 'expense' | 'revenue' | null;
  registeredRecordId: string | null;
  possibleDuplicate: boolean;
  duplicateCandidate: PluggyDuplicateCandidate | null;
  importable: boolean;
  importUnavailableReason: string | null;
}

export interface PluggyTransactionImportRequest {
  transactionId: string;
  recordType: 'expense' | 'revenue';
  description: string;
  amount: number;
  date: string;
  idContaFinanceira?: string | null;
  idCategoria?: string | null;
  natureza?: 'RendaDisponivel' | 'EntradaVinculadaDespesa' | 'Reembolso' | null;
  despesaVinculadaId?: string | null;
}

export interface PluggyTransactionImportResult {
  transactionId: string;
  recordType: 'expense' | 'revenue';
  recordId: string;
  registeredAt: string;
}
