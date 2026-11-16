import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ResumoFatura, SalvarFaturaRequest } from '../models/conciliacao-fatura.model';

@Injectable({ providedIn: 'root' })
export class ConciliacaoFaturaService {
  private readonly baseUrl = `${environment.apiUrl}/ConciliacaoFatura`;
  constructor(private readonly http: HttpClient) {}

  obter(contaId: string, mes: number, ano: number): Observable<ResumoFatura> {
    return this.http.get<ResumoFatura>(`${this.baseUrl}/${contaId}`, {
      params: { mes: String(mes), ano: String(ano) }
    });
  }

  salvar(contaId: string, request: SalvarFaturaRequest): Observable<ResumoFatura> {
    return this.http.put<ResumoFatura>(`${this.baseUrl}/${contaId}`, request);
  }
}
