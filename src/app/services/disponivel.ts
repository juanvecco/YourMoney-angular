import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Despesa } from './despesa';
import { Receita } from './receita';

export interface Disponivel {
    id: string;
    valor: number;
    data: string;
}

@Injectable({
    providedIn: 'root',
})
export class DisponivelService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    obterPorReferenciaReceita(mes: number, ano: number): Observable<Receita[]> {
        return this.http.get<Receita[]>(`${this.baseUrl}/Receitas/por-referencia`, {
            params: { mes: mes.toString(), ano: ano.toString() }
        });
    }

    obterPorReferenciaDespesa(mes: number, ano: number): Observable<Despesa[]> {
        return this.http.get<Despesa[]>(`${this.baseUrl}/Despesas/por-referencia`, {
            params: { mes: mes.toString(), ano: ano.toString() }
        });
    }
}