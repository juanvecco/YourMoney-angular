import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Receita {
    id: string;
    descricao: string;
    valor: number;
    data: string;
}

@Injectable({
    providedIn: 'root',
})
export class ReceitaService {
    private baseUrl = environment.apiUrl;

    constructor(private http: HttpClient) { }

    obterPorReferencia(mes: number, ano: number): Observable<Receita[]> {
        return this.http.get<Receita[]>(`${this.baseUrl}/Receitas/por-referencia`, {
            params: { mes: mes.toString(), ano: ano.toString() }
        });
    }

    criarReceita(receita: {
        descricao: string;
        valor: number;
        data: string;
    }): Observable<Receita> {
        return this.http.post<Receita>(`${this.baseUrl}/Receitas`, receita);
    }

    atualizarReceita(receita: {
        id: string;
        descricao: string;
        valor: number;
        data: string;
    }): Observable<Receita> {
        return this.http.put<Receita>(`${this.baseUrl}/Receitas/${receita.id}`, receita);
    }

    deletarReceita(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/Receitas/${id}`);
    }
}