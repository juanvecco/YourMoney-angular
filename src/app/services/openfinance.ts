import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  OpenFinanceSourcesResponse,
  OpenFinanceTransactionPreviewResponse
} from '../models/openfinance.model';

@Injectable({
  providedIn: 'root',
})
export class OpenFinanceService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

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
}
