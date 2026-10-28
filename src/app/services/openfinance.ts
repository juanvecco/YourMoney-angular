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
  PluggyConnectToken,
  PluggyCredentialStatus,
  PluggyOverview,
  PluggyOverviewFilter,
  PluggyTransactionImportRequest,
  PluggyTransactionImportResult,
  PluggyTransactionPreview
} from '../models/pluggy.model';

@Injectable({
  providedIn: 'root',
})
export class OpenFinanceService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  obterConfiguracaoCredenciaisPluggy(): Observable<PluggyCredentialStatus> {
    return this.http.get<PluggyCredentialStatus>(`${this.baseUrl}/OpenFinance/pluggy-configuration`);
  }

  salvarConfiguracaoCredenciaisPluggy(clientId: string, clientSecret: string): Observable<PluggyCredentialStatus> {
    return this.http.put<PluggyCredentialStatus>(`${this.baseUrl}/OpenFinance/pluggy-configuration`, {
      clientId,
      clientSecret,
    });
  }

  obterFontes(): Observable<OpenFinanceSourcesResponse> {
    return this.http.get<OpenFinanceSourcesResponse>(`${this.baseUrl}/OpenFinance/sources`);
  }

  obterPreviewTransacoes(sourceId?: string): Observable<OpenFinanceTransactionPreviewResponse> {
    const params = sourceId ? new HttpParams().set('sourceId', sourceId) : undefined;
    return this.http.get<OpenFinanceTransactionPreviewResponse>(
      `${this.baseUrl}/OpenFinance/transactions/preview`,
      { params }
    );
  }

  verificarProvedor(): Observable<{ accessToken: string; expiresAt: string }> {
    return this.http.post<{ accessToken: string; expiresAt: string }>(
      `${this.baseUrl}/OpenFinance/connect-token`,
      {}
    );
  }

  obterConnectToken(connectionId?: string): Observable<PluggyConnectToken> {
    return this.http.post<PluggyConnectToken>(
      `${this.baseUrl}/OpenFinance/connect-token`,
      connectionId ? { connectionId } : {}
    );
  }

  registrarConexao(itemId: string, connectionId?: string | null): Observable<PluggyConnection> {
    return this.http.post<PluggyConnection>(`${this.baseUrl}/OpenFinance/connections`, { itemId, connectionId });
  }

  obterConexoes(): Observable<PluggyConnection[]> {
    return this.http.get<PluggyConnection[]>(`${this.baseUrl}/OpenFinance/connections`);
  }

  obterContasPluggy(): Observable<PluggyAccount[]> {
    return this.http.get<PluggyAccount[]>(`${this.baseUrl}/OpenFinance/accounts`);
  }

  obterTransacoesPluggy(): Observable<PluggyTransactionPreview[]> {
    return this.http.get<PluggyTransactionPreview[]>(`${this.baseUrl}/OpenFinance/real-transactions/preview`);
  }

  obterVisaoGeralPluggy(filtro: PluggyOverviewFilter = {}): Observable<PluggyOverview> {
    let params = new HttpParams();
    if (filtro.connectionId) params = params.set('connectionId', filtro.connectionId);
    if (filtro.accountId) params = params.set('accountId', filtro.accountId);
    if (filtro.from) params = params.set('from', filtro.from);
    if (filtro.to) params = params.set('to', filtro.to);
    return this.http.get<PluggyOverview>(`${this.baseUrl}/OpenFinance/real-transactions/overview`, { params });
  }

  importarTransacaoPluggy(request: PluggyTransactionImportRequest): Observable<PluggyTransactionImportResult> {
    return this.http.post<PluggyTransactionImportResult>(`${this.baseUrl}/OpenFinance/real-transactions/import`, request);
  }

  removerConexao(connectionId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/OpenFinance/connections/${connectionId}`);
  }
}
