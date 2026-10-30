import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ContaFinanceira } from '../models/despesa.model';

export interface ContaFinanceiraRequest {
  descricao: string;
}

@Injectable({ providedIn: 'root' })
export class ContaFinanceiraService {
  private readonly baseUrl = environment.apiUrl + '/ContaFinanceira';

  constructor(private readonly http: HttpClient) {}

  criarConta(request: ContaFinanceiraRequest): Observable<ContaFinanceira> {
    return this.http.post<ContaFinanceira>(this.baseUrl, request);
  }

  listarContas(): Observable<ContaFinanceira[]> {
    return this.http.get<ContaFinanceira[]>(this.baseUrl);
  }

  listarInstituicoesBancarias(): Observable<string[]> {
    return this.http.get<string[]>(this.baseUrl + '/instituicoes');
  }

  atualizarConta(id: string, request: ContaFinanceiraRequest): Observable<ContaFinanceira> {
    return this.http.put<ContaFinanceira>(this.baseUrl + '/' + id, request);
  }

  removerConta(id: string): Observable<void> {
    return this.http.delete<void>(this.baseUrl + '/' + id);
  }
}
