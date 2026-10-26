import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CriarGrupoObjetivoRequest,
  ExcluirGrupoObjetivoRequest,
  GrupoObjetivoInvestimento,
  RenomearGrupoObjetivoRequest,
} from '../models/investimento-grupo.model';

@Injectable({ providedIn: 'root' })
export class InvestimentoGrupoService {
  private readonly baseUrl = `${environment.apiUrl}/InvestimentoGrupos`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<GrupoObjetivoInvestimento[]> {
    return this.http.get<GrupoObjetivoInvestimento[]>(this.baseUrl);
  }

  obter(id: string): Observable<GrupoObjetivoInvestimento> {
    return this.http.get<GrupoObjetivoInvestimento>(`${this.baseUrl}/${id}`);
  }

  criar(request: CriarGrupoObjetivoRequest): Observable<GrupoObjetivoInvestimento> {
    return this.http.post<GrupoObjetivoInvestimento>(this.baseUrl, request);
  }

  renomear(id: string, request: RenomearGrupoObjetivoRequest): Observable<GrupoObjetivoInvestimento> {
    return this.http.put<GrupoObjetivoInvestimento>(`${this.baseUrl}/${id}`, request);
  }

  excluir(id: string, request: ExcluirGrupoObjetivoRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/exclusao`, request);
  }
}
