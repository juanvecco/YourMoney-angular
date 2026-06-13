import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
    AtualizarReceitaRequest,
    CriarReceitaRequest,
    CriarReceitaResponse,
    Receita
} from '../models/receita.model';

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

    criarReceita(receita: CriarReceitaRequest): Observable<CriarReceitaResponse> {
        return this.http.post<CriarReceitaResponse>(`${this.baseUrl}/Receitas`, receita);
    }

    atualizarReceita(receita: AtualizarReceitaRequest): Observable<void> {
        return this.http.put<void>(`${this.baseUrl}/Receitas/${receita.id}`, receita);
    }

    deletarReceita(id: string): Observable<void> {
        return this.http.delete<void>(`${this.baseUrl}/Receitas/${id}`);
    }
}
