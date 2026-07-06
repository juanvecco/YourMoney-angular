import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AtualizarDespesaRequest,
  Categoria,
  ConsultaDespesasRequest,
  ConsultaDespesasResponse,
  ConsultaDespesasTotalPorConta,
  ContaFinanceira,
  CriarDespesaRequest,
  CriarDespesaResponse,
  CriarParcelamentoRequest,
  CriarParcelamentoResponse,
  Despesa
} from '../models/despesa.model';

export type {
  AtualizarDespesaRequest,
  Categoria,
  ConsultaDespesasRequest,
  ConsultaDespesasResponse,
  ConsultaDespesasTotalPorConta,
  ContaFinanceira,
  CriarDespesaRequest,
  CriarDespesaResponse,
  CriarParcelamentoRequest,
  CriarParcelamentoResponse,
  Despesa,
  ParcelaDespesa,
  ParcelaPreview
} from '../models/despesa.model';

@Injectable({
  providedIn: 'root',
})
export class DespesaService {
  private baseUrl = environment.apiUrl;

  private _todasCategorias: Categoria[] = [];

  get todasCategorias(): Categoria[] {
    return this._todasCategorias;
  }

  setCategorias(categorias: Categoria[]) {
    this._todasCategorias = categorias;
  }

  constructor(private http: HttpClient) { }

  obterPorReferencia(mes: number, ano: number): Observable<Despesa[]> {
    return this.http.get<Despesa[]>(`${this.baseUrl}/Despesas/por-referencia`, {
      params: { mes: mes.toString(), ano: ano.toString() }
    });
  }

  consultarDespesas(request: ConsultaDespesasRequest): Observable<ConsultaDespesasResponse> {
    const params: Record<string, string> = {
      mes: request.mes.toString(),
      ano: request.ano.toString(),
      pagina: (request.pagina ?? 1).toString(),
      tamanhoPagina: (request.tamanhoPagina ?? 10).toString()
    };

    if (request.idContaFinanceira) params['idContaFinanceira'] = request.idContaFinanceira;
    if (request.idTipoDespesa) params['idTipoDespesa'] = request.idTipoDespesa;
    if (request.idNaturezaDespesa) params['idNaturezaDespesa'] = request.idNaturezaDespesa;

    return this.http.get<ConsultaDespesasResponse>(`${this.baseUrl}/Despesas/consulta`, { params });
  }

  criarDespesa(despesa: CriarDespesaRequest): Observable<CriarDespesaResponse> {
    return this.http.post<CriarDespesaResponse>(`${this.baseUrl}/Despesas`, despesa);
  }

  criarParcelamento(request: CriarParcelamentoRequest): Observable<CriarParcelamentoResponse> {
    return this.http.post<CriarParcelamentoResponse>(`${this.baseUrl}/Despesas/parcelamento`, request);
  }

  atualizarDespesa(despesa: AtualizarDespesaRequest): Observable<Despesa> {
    return this.http.put<Despesa>(`${this.baseUrl}/Despesas/${despesa.id}`, despesa);
  }

  deletarDespesa(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Despesas/${id}`);
  }

  listarContas(): Observable<ContaFinanceira[]> {
    return this.http.get<ContaFinanceira[]>(`${this.baseUrl}/ContaFinanceira`);
  }


  listarCategorias(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.baseUrl}/Categoria`).pipe(
      tap(categorias => {
        this.setCategorias(categorias);
      })
    );
  }

  get listarTodasCategorias(): Categoria[] {
    return this.todasCategorias;
  }

  criarCategoria(categoria: {
    descricao: string;
    tipoTransacao: number;
    categoriaPaiId?: string;
  }): Observable<Categoria> {
    return this.http.post<Categoria>(`${this.baseUrl}/Categoria`, categoria);
  }
}

