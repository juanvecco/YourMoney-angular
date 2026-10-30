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
  message?: string | null;
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
  targetType?: 'investment';
}

export interface PluggyDuplicateCandidate {
  recordType: 'expense' | 'revenue' | 'investment';
  recordId: string;
  description: string;
  date: string;
  amount: number;
  reason: string;
  accountName?: string | null;
  categoryName?: string | null;
  canLink?: boolean;
  canReplace?: boolean;
  cannotReplaceReason?: string | null;
  matchReasons?: string[];
  name?: string | null;
  quantity?: number | null;
  averagePrice?: number | null;
  groupName?: string | null;
  assetType?: string | null;
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
  registeredRecordType: 'expense' | 'revenue' | 'investment' | null;
  registeredRecordId: string | null;
  possibleDuplicate: boolean;
  duplicateCandidate: PluggyDuplicateCandidate | null;
  possibleDuplicateCandidates?: PluggyDuplicateCandidate[];
  importable: boolean;
  suggestedAmountBrl?: number | null;
  importUnavailableReason: string | null;
}

export type PluggyExpenseReconciliationAction = 'create' | 'link' | 'replace';

export interface PluggyExpenseReconciliationRequest {
  transactionId: string;
  action: PluggyExpenseReconciliationAction;
  targetExpenseId?: string | null;
  expectedDescription?: string | null;
  expectedAmount?: number | null;
  expectedDate?: string | null;
  description?: string | null;
  amount?: number | null;
  date?: string | null;
  idContaFinanceira?: string | null;
  idCategoria?: string | null;
  confirmPossibleDuplicate?: boolean;
}

export interface PluggyExpenseReconciliationResult {
  transactionId: string;
  action: PluggyExpenseReconciliationAction;
  recordType: 'expense';
  recordId: string;
  registeredAt: string;
}

export type PluggyInvestmentReconciliationAction = 'create' | 'link' | 'replace';

export interface PluggyInvestmentReconciliationRequest {
  transactionId: string;
  action: PluggyInvestmentReconciliationAction;
  targetInvestmentId?: string | null;
  expectedDescription?: string | null;
  expectedAmount?: number | null;
  expectedDate?: string | null;
  investment?: {
    nome: string;
    descricao: string;
    tipo: string;
    quantidade: number;
    precoMedio: number;
    valorAtual: number;
    dataInvestimento: string;
    mesReferencia: string;
    receitaRecorrenteId: string | null;
    grupoObjetivoId?: string | null;
    tipoAtivo?: string | null;
    operacaoId: string;
  };
  description?: string | null;
  amount?: number | null;
  date?: string | null;
  confirmPossibleDuplicate?: boolean;
}

export interface PluggyInvestmentReconciliationResult {
  transactionId: string;
  action: PluggyInvestmentReconciliationAction;
  recordType: 'investment';
  recordId: string;
  registeredAt: string;
}

export interface PluggyInvestmentAssetConnection {
  connectionId: string;
  institutionName: string;
  hasInvestmentProduct: boolean;
  status: 'never' | 'loading' | 'current' | 'empty' | 'no_product' | 'stale' | string;
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  nextRefreshAt: string | null;
  retryAfterAt?: string | null;
  message: string | null;
  assetCount: number;
}

export interface PluggyInvestmentAssetCandidate {
  investmentId: string;
  name: string;
  type: string;
  code: string | null;
  isin: string | null;
  reason: string;
  valueDifference?: number | null;
  valueDifferencePercent?: number | null;
  canReplace: boolean;
  cannotReplaceReason: string | null;
  descricao?: string;
  quantidade?: number;
  precoMedio?: number;
  valorAtual?: number;
  dataInvestimento?: string;
  mesReferencia?: string | null;
  receitaRecorrenteId?: string | null;
  grupoObjetivoId?: string | null;
  tipoAtivo?: string | null;
  precoUnitarioAtual?: number | null;
}

export interface PluggyInvestmentAsset {
  investmentId: string;
  itemId: string;
  connectionId: string;
  institutionName: string;
  name: string;
  type: string;
  subtype: string | null;
  code: string | null;
  isin: string | null;
  balance: number;
  currencyCode: string;
  quantity: number | null;
  currentUnitQuote: number | null;
  originalAmount: number | null;
  positionDate: string;
  purchaseDate: string | null;
  issuer: string | null;
  issuerCnpj: string | null;
  status: string | null;
  sourceUpdatedAt: string | null;
  snapshotToken: string;
  isStale: boolean;
  canReconcile: boolean;
  reconcileUnavailableReason: string | null;
  linkedInvestmentId: string | null;
  linkedInvestmentName: string | null;
  candidates: PluggyInvestmentAssetCandidate[];
}

export interface PluggyInvestmentAssetsOverview {
  generatedAt: string;
  connections: PluggyInvestmentAssetConnection[];
  assets: PluggyInvestmentAsset[];
}

export type PluggyInvestmentAssetReconciliationAction = 'link' | 'replace' | 'create';

export interface PluggyInvestmentAssetReconciliationRequest {
  connectionId: string;
  externalInvestmentId: string;
  snapshotToken: string;
  action: PluggyInvestmentAssetReconciliationAction;
  targetInvestmentId?: string | null;
  expectedLocalName?: string | null;
  expectedLocalValue?: number | null;
  confirmPossibleDuplicate?: boolean;
  investment?: {
    nome: string;
    descricao: string;
    tipo: string;
    quantidade: number;
    precoMedio: number;
    valorAtual: number;
    codigoAtivo?: string | null;
    isin?: string | null;
    precoUnitarioAtual?: number | null;
    dataInvestimento: string;
    mesReferencia: string;
    receitaRecorrenteId: string | null;
    grupoObjetivoId?: string | null;
    tipoAtivo?: string | null;
    operacaoId: string;
  };
}

export interface PluggyInvestmentAssetReconciliationResult {
  externalInvestmentId: string;
  action: PluggyInvestmentAssetReconciliationAction;
  investmentId: string;
  registeredAt: string;
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
