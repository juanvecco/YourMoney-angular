import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ConfirmarSugestaoReceitaRecorrenteRequest,
  ConfirmarSugestaoReceitaRecorrenteResponse,
  EncerrarReceitaRecorrenteRequest,
  ListarReceitasRecorrentesResponse,
  ListarSugestoesReceitasRecorrentesResponse,
  ProjecaoReservaEmergenciaResponse,
  ReceitaRecorrenteRequest,
  ReceitaRecorrenteResponse
} from '../models/receita-recorrente.model';

@Injectable({ providedIn: 'root' })
export class ReceitaRecorrenteService {
  private readonly baseUrl = `${environment.apiUrl}/ReceitasRecorrentes`;

  constructor(private http: HttpClient) { }

  listar(ativas?: boolean): Observable<ListarReceitasRecorrentesResponse> {
    const params = ativas === undefined ? undefined : { ativas: String(ativas) };
    return this.http.get<ListarReceitasRecorrentesResponse>(this.baseUrl, { params });
  }

  obterPorId(id: string): Observable<ReceitaRecorrenteResponse> {
    return this.http.get<ReceitaRecorrenteResponse>(`${this.baseUrl}/${id}`);
  }

  criar(request: ReceitaRecorrenteRequest): Observable<ReceitaRecorrenteResponse> {
    return this.http.post<ReceitaRecorrenteResponse>(this.baseUrl, request);
  }

  atualizar(id: string, request: ReceitaRecorrenteRequest): Observable<ReceitaRecorrenteResponse> {
    return this.http.put<ReceitaRecorrenteResponse>(`${this.baseUrl}/${id}`, request);
  }

  desativar(id: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/desativar`, {});
  }

  encerrar(id: string, request: EncerrarReceitaRecorrenteRequest): Observable<ReceitaRecorrenteResponse> {
    return this.http.patch<ReceitaRecorrenteResponse>(`${this.baseUrl}/${id}/encerrar`, request);
  }

  listarSugestoes(mes: number, ano: number): Observable<ListarSugestoesReceitasRecorrentesResponse> {
    return this.http.get<ListarSugestoesReceitasRecorrentesResponse>(`${this.baseUrl}/sugestoes`, {
      params: { mes: String(mes), ano: String(ano) }
    });
  }

  confirmarSugestao(
    ocorrenciaId: string,
    request: ConfirmarSugestaoReceitaRecorrenteRequest
  ): Observable<ConfirmarSugestaoReceitaRecorrenteResponse> {
    return this.http.post<ConfirmarSugestaoReceitaRecorrenteResponse>(
      `${this.baseUrl}/sugestoes/${ocorrenciaId}/confirmar`,
      request
    );
  }

  ignorarSugestao(ocorrenciaId: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sugestoes/${ocorrenciaId}/ignorar`, {});
  }

  obterProjecaoReserva(): Observable<ProjecaoReservaEmergenciaResponse> {
    return this.http.get<ProjecaoReservaEmergenciaResponse>(`${this.baseUrl}/reserva-emergencia`);
  }
}
