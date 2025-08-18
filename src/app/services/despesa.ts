import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface Despesa {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  idContaFinanceira: string;
  idCategoria: string;
}

export interface ContaFinanceira {
  id: string;
  descricao: string;
}

export interface Categoria {
  id: string;
  descricao: string;
  tipoTransacao: number;
  categoriaPaiId?: string | null;
}

@Injectable({
  providedIn: 'root',
})
export class DespesaService {
  private baseUrl = 'https://localhost:60915/api';

  private todasCategorias: Categoria[] = [];

  constructor(private http: HttpClient) { }

  obterPorReferencia(mes: number, ano: number): Observable<Despesa[]> {
    return this.http.get<Despesa[]>(`${this.baseUrl}/Despesas/por-referencia`, {
      params: { mes: mes.toString(), ano: ano.toString() }
    });
  }

  criarDespesa(despesa: {
    descricao: string;
    valor: number;
    data: string;
    idContaFinanceira: string;
    idCategoria: string;
  }): Observable<Despesa> {
    return this.http.post<Despesa>(`${this.baseUrl}/Despesas`, despesa);
  }

  atualizarDespesa(despesa: {
    id: string;
    descricao: string;
    valor: number;
    data: string;
    idContaFinanceira: string;
    idCategoria: string;
  }): Observable<Despesa> {
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
        this.todasCategorias = categorias;
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
  // listarCategorias(): Observable<Categoria[]> {
  //   return this.http.get<Categoria[]>(`${this.baseUrl}/Categorias`);
  // }
}

