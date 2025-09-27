import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class ContaFinanceira {
    private baseUrl = `${environment.apiUrl}/contas`;

    constructor(private http: HttpClient) { }

    criarConta(conta: { descricao: string }): Observable<ContaFinanceira> {
        return this.http.post<ContaFinanceira>(`${this.baseUrl}/ContaFinanceira`, conta);
    }
    listarContas(): Observable<ContaFinanceira[]> {
        return this.http.get<ContaFinanceira[]>(`${this.baseUrl}/ContaFinanceira`);
    }
}