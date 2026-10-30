import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AtualizarInvestimentoRequest,
  CriarInvestimentoRequest,
  CriarInvestimentoResponse,
  Investimento,
  CarteiraInvestimentosConsolidada,
  FiltroOrganizacaoInvestimentos
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

  obterConsolidado(filtro: FiltroOrganizacaoInvestimentos = {}): Observable<CarteiraInvestimentosConsolidada> {
    let params = new HttpParams();
    if (filtro.grupoObjetivoId) params = params.set('grupoObjetivoId', filtro.grupoObjetivoId);
    if (filtro.semGrupo) params = params.set('semGrupo', 'true');
    if (filtro.tipoAtivo) params = params.set('tipoAtivo', filtro.tipoAtivo);
    if (filtro.naoClassificado) params = params.set('naoClassificado', 'true');
    return this.http.get<CarteiraInvestimentosConsolidada>(`${this.baseUrl}/Investimento/consolidado`, { params });
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
