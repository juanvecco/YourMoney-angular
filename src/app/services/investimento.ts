import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface Investimento {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  valorAtual: number;
  dataInvestimento: Date;
  dataResgate: Date;
  ativo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class InvestimentoService {
  private baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  obterPorReferencia(mes: number, ano: number): Observable<Investimento[]> {
    return this.http.get<Investimento[]>(`${this.baseUrl}/Investimento/por-referencia`, {
      params: { mes: mes.toString(), ano: ano.toString() }
    });
  }

  criarInvestimento(investimento: {
    nome: string;
    descricao: string;
    tipo: string;
    quantidade: number;
    precoMedio: number;
    valorAtual: number;
    dataInvestimento: string;
    dataResgate: string;
    ativo: boolean;
  }): Observable<Investimento> {
    return this.http.post<Investimento>(`${this.baseUrl}/Investimento`, investimento);
  }

  atualizarInvestimento(investimento: {
    id: string;
    nome: string;
    descricao: string;
    tipo: string;
    quantidade: number;
    precoMedio: number;
    valorAtual: number;
    dataInvestimento: string;
    dataResgate: string;
    ativo: boolean;
  }): Observable<Investimento> {
    return this.http.put<Investimento>(`${this.baseUrl}/Investimento/${investimento.id}`, investimento);
  }

  deletarInvestimento(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/Investimento/${id}`);
  }
};
