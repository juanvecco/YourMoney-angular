import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ConsultaMovimentacoes, ConsultaMovimentacoesResponse } from '../models/movimentacao.model';

@Injectable({ providedIn: 'root' })
export class MovimentacaoService {
  private readonly baseUrl = environment.apiUrl + '/Movimentacoes';

  constructor(private readonly http: HttpClient) {}

  consultar(filtro: ConsultaMovimentacoes): Observable<ConsultaMovimentacoesResponse> {
    let params = new HttpParams()
      .set('mesInicial', filtro.mesInicial)
      .set('mesFinal', filtro.mesFinal)
      .set('pagina', filtro.pagina ?? 1)
      .set('tamanhoPagina', filtro.tamanhoPagina ?? 25);

    if (filtro.tipo) params = params.set('tipo', filtro.tipo);
    if (filtro.contaFinanceiraId) params = params.set('contaFinanceiraId', filtro.contaFinanceiraId);
    if (filtro.busca?.trim()) params = params.set('busca', filtro.busca.trim());
    return this.http.get<ConsultaMovimentacoesResponse>(this.baseUrl, { params });
  }
}
