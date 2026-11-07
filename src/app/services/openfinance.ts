import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  OpenFinanceSourcesResponse,
  OpenFinanceTransactionPreviewResponse
} from '../models/openfinance.model';
import {
  PluggyAccount,
  PluggyConnection,
  PluggyConnectionStatus,
  PluggyConnectToken,
  PluggyCredentialStatus,
  PluggyExpenseReconciliationRequest,
  PluggyExpenseReconciliationResult,
  PluggyInvestmentReconciliationRequest,
  PluggyInvestmentReconciliationResult,
  PluggyInvestmentAssetsOverview,
  PluggyInvestmentAssetReconciliationRequest,
  PluggyInvestmentAssetReconciliationResult,
  PluggyOverview,
  PluggyOverviewFilter,
  PluggyTransactionImportRequest,
  PluggyTransactionImportResult,
  PluggyTransactionPreview
} from '../models/pluggy.model';

@Injectable({ providedIn: 'root' })
export class OpenFinanceService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private readonly http: HttpClient) {}

  obterStatusConexao(): Observable<PluggyConnectionStatus> {
    return this.http.get<PluggyConnectionStatus>(`${this.baseUrl}/OpenFinance/connection-status`);
  }

  reconciliarDespesaPluggy(request: PluggyExpenseReconciliationRequest, carteiraId?: string): Observable<PluggyExpenseReconciliationResult> {
    return this.http.post<PluggyExpenseReconciliationResult>(`${this.baseUrl}/OpenFinance/real-transactions/reconcile`, request, {
      params: this.walletParams(carteiraId),
    });
  }

  reconciliarInvestimentoPluggy(request: PluggyInvestmentReconciliationRequest, carteiraId?: string): Observable<PluggyInvestmentReconciliationResult> {
    return this.http.post<PluggyInvestmentReconciliationResult>(`${this.baseUrl}/OpenFinance/real-transactions/reconcile-investment`, request, {
      params: this.walletParams(carteiraId),
    });
  }

  obterAtivosInvestimentoPluggy(connectionId?: string, retryFailed = false, carteiraId?: string): Observable<PluggyInvestmentAssetsOverview> {
    let params = this.walletParams(carteiraId);
    if (connectionId) params = params.set('connectionId', connectionId);
    if (retryFailed) params = params.set('retryFailed', 'true');
    return this.http.get<PluggyInvestmentAssetsOverview>(`${this.baseUrl}/OpenFinance/investments/preview`, { params });
  }

  reconciliarAtivoInvestimentoPluggy(request: PluggyInvestmentAssetReconciliationRequest, carteiraId?: string): Observable<PluggyInvestmentAssetReconciliationResult> {
    return this.http.post<PluggyInvestmentAssetReconciliationResult>(`${this.baseUrl}/OpenFinance/investments/reconcile`, request, {
      params: this.walletParams(carteiraId),
    });
  }

  obterConfiguracaoCredenciaisPluggy(carteiraId?: string): Observable<PluggyCredentialStatus> {
    return this.http.get<PluggyCredentialStatus>(`${this.baseUrl}/OpenFinance/pluggy-configuration`, {
      params: this.walletParams(carteiraId),
    });
  }

  salvarConfiguracaoCredenciaisPluggy(clientId: string, clientSecret: string, carteiraId?: string): Observable<PluggyCredentialStatus> {
    return this.http.put<PluggyCredentialStatus>(`${this.baseUrl}/OpenFinance/pluggy-configuration`, { clientId, clientSecret }, {
      params: this.walletParams(carteiraId),
    });
  }

  obterFontes(): Observable<OpenFinanceSourcesResponse> {
    return this.http.get<OpenFinanceSourcesResponse>(`${this.baseUrl}/OpenFinance/sources`);
  }

  obterPreviewTransacoes(sourceId?: string): Observable<OpenFinanceTransactionPreviewResponse> {
    const params = sourceId ? new HttpParams().set('sourceId', sourceId) : undefined;
    return this.http.get<OpenFinanceTransactionPreviewResponse>(`${this.baseUrl}/OpenFinance/transactions/preview`, { params });
  }

  verificarProvedor(carteiraId?: string): Observable<{ accessToken: string; expiresAt: string }> {
    return this.http.post<{ accessToken: string; expiresAt: string }>(`${this.baseUrl}/OpenFinance/connect-token`, {}, {
      params: this.walletParams(carteiraId),
    });
  }

  obterConnectToken(connectionId?: string, carteiraId?: string): Observable<PluggyConnectToken> {
    return this.http.post<PluggyConnectToken>(`${this.baseUrl}/OpenFinance/connect-token`, connectionId ? { connectionId } : {}, {
      params: this.walletParams(carteiraId),
    });
  }

  registrarConexao(itemId: string, connectionId?: string | null, carteiraId?: string): Observable<PluggyConnection> {
    return this.http.post<PluggyConnection>(`${this.baseUrl}/OpenFinance/connections`, { itemId, connectionId }, {
      params: this.walletParams(carteiraId),
    });
  }

  obterConexoes(carteiraId?: string): Observable<PluggyConnection[]> {
    return this.http.get<PluggyConnection[]>(`${this.baseUrl}/OpenFinance/connections`, { params: this.walletParams(carteiraId) });
  }

  obterContasPluggy(carteiraId?: string): Observable<PluggyAccount[]> {
    return this.http.get<PluggyAccount[]>(`${this.baseUrl}/OpenFinance/accounts`, { params: this.walletParams(carteiraId) });
  }

  obterTransacoesPluggy(carteiraId?: string): Observable<PluggyTransactionPreview[]> {
    return this.http.get<PluggyTransactionPreview[]>(`${this.baseUrl}/OpenFinance/real-transactions/preview`, { params: this.walletParams(carteiraId) });
  }

  obterVisaoGeralPluggy(filtro: PluggyOverviewFilter = {}, carteiraId?: string): Observable<PluggyOverview> {
    let params = this.walletParams(carteiraId);
    if (filtro.connectionId) params = params.set('connectionId', filtro.connectionId);
    if (filtro.accountId) params = params.set('accountId', filtro.accountId);
    if (filtro.from) params = params.set('from', filtro.from);
    if (filtro.to) params = params.set('to', filtro.to);
    if (filtro.targetType) params = params.set('targetType', filtro.targetType);
    return this.http.get<PluggyOverview>(`${this.baseUrl}/OpenFinance/real-transactions/overview`, { params });
  }

  importarTransacaoPluggy(request: PluggyTransactionImportRequest, carteiraId?: string): Observable<PluggyTransactionImportResult> {
    return this.http.post<PluggyTransactionImportResult>(`${this.baseUrl}/OpenFinance/real-transactions/import`, request, {
      params: this.walletParams(carteiraId),
    });
  }

  removerConexao(connectionId: string, carteiraId?: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/OpenFinance/connections/${connectionId}`, {
      params: this.walletParams(carteiraId),
    });
  }

  private walletParams(carteiraId?: string): HttpParams {
    return carteiraId ? new HttpParams().set('carteiraId', carteiraId) : new HttpParams();
  }
}
