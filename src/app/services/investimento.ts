import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AtualizarInvestimentoRequest,
  CriarInvestimentoRequest,
  CriarInvestimentoResponse,
  Investimento,
  CarteiraInvestimentosConsolidada
} from '../models/investimento.model';

export type {
  AtualizarInvestimentoRequest,
  CriarInvestimentoRequest,
  CriarInvestimentoResponse,
  Investimento
} from '../models/investimento.model';

@Injectable({
  providedIn: 'root'
})
export class InvestimentoService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  obterPorReferencia(mes: number, ano: number): Observable<Investimento[]> {
    return this.http.get<Investimento[]>(`${this.baseUrl}/Investimento/por-referencia`, {
      params: { mes: mes.toString(), ano: ano.toString() }
    });
  }

  obterConsolidado(): Observable<CarteiraInvestimentosConsolidada> {
    return this.http.get<CarteiraInvestimentosConsolidada>(`${this.baseUrl}/Investimento/consolidado`);
  }

  obterPorId(id: string): Observable<Investimento> {
    return this.http.get<Investimento>(`${this.baseUrl}/Investimento/${id}`);
  }

  criarInvestimento(request: CriarInvestimentoRequest): Observable<CriarInvestimentoResponse> {
    return this.http.post<CriarInvestimentoResponse>(`${this.baseUrl}/Investimento`, request);
  }

  atualizarInvestimento(request: AtualizarInvestimentoRequest): Observable<Investimento> {
    const { id, ...payload } = request;
    return this.http.put<Investimento>(`${this.baseUrl}/Investimento/${id}`, payload);
  }

  deletarInvestimento(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Investimento/${id}`);
  }
}
