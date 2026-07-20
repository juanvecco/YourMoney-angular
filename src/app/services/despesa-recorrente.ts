import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ConfirmarSugestaoDespesaRecorrenteRequest,
  ConfirmarSugestaoDespesaRecorrenteResponse,
  DespesaRecorrenteRequest,
  DespesaRecorrenteResponse,
  EncerrarDespesaRecorrenteRequest,
  ListarDespesasRecorrentesResponse,
  ListarSugestoesDespesasRecorrentesResponse
} from '../models/despesa-recorrente.model';

@Injectable({
  providedIn: 'root'
})
export class DespesaRecorrenteService {
  private baseUrl = `${environment.apiUrl}/DespesasRecorrentes`;

  constructor(private http: HttpClient) { }

  listar(ativas?: boolean): Observable<ListarDespesasRecorrentesResponse> {
    const params = ativas === undefined ? undefined : { ativas: String(ativas) };
    return this.http.get<ListarDespesasRecorrentesResponse>(this.baseUrl, { params });
  }

  obterPorId(id: string): Observable<DespesaRecorrenteResponse> {
    return this.http.get<DespesaRecorrenteResponse>(`${this.baseUrl}/${id}`);
  }

  criar(request: DespesaRecorrenteRequest): Observable<DespesaRecorrenteResponse> {
    return this.http.post<DespesaRecorrenteResponse>(this.baseUrl, request);
  }

  atualizar(id: string, request: DespesaRecorrenteRequest): Observable<DespesaRecorrenteResponse> {
    return this.http.put<DespesaRecorrenteResponse>(`${this.baseUrl}/${id}`, request);
  }

  desativar(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/desativar`, {});
  }

  encerrar(id: string, request: EncerrarDespesaRecorrenteRequest): Observable<DespesaRecorrenteResponse> {
    return this.http.patch<DespesaRecorrenteResponse>(`${this.baseUrl}/${id}/encerrar`, request);
  }

  listarSugestoes(mes: number, ano: number): Observable<ListarSugestoesDespesasRecorrentesResponse> {
    return this.http.get<ListarSugestoesDespesasRecorrentesResponse>(`${this.baseUrl}/sugestoes`, {
      params: {
        mes: String(mes),
        ano: String(ano)
      }
    });
  }

  confirmarSugestao(
    ocorrenciaId: string,
    request: ConfirmarSugestaoDespesaRecorrenteRequest
  ): Observable<ConfirmarSugestaoDespesaRecorrenteResponse> {
    return this.http.post<ConfirmarSugestaoDespesaRecorrenteResponse>(
      `${this.baseUrl}/sugestoes/${ocorrenciaId}/confirmar`,
      request
    );
  }

  ignorarSugestao(ocorrenciaId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sugestoes/${ocorrenciaId}/ignorar`, {});
  }
}
