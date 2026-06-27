import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  AtualizarMetaMensalRequest,
  CriarMetaMensalRequest,
  MetaMensal,
  MetasMensaisResumo
} from '../models/meta-mensal.model';

@Injectable({
  providedIn: 'root',
})
export class MetaMensalService {
  private baseUrl = `${environment.apiUrl}/Metas`;

  constructor(private http: HttpClient) { }

  obterResumo(mes: number, ano: number): Observable<MetasMensaisResumo> {
    return this.http.get<MetasMensaisResumo>(`${this.baseUrl}/resumo`, {
      params: { mes: mes.toString(), ano: ano.toString() }
    });
  }

  criarMeta(request: CriarMetaMensalRequest): Observable<MetaMensal> {
    return this.http.post<MetaMensal>(this.baseUrl, request);
  }

  atualizarMeta(request: AtualizarMetaMensalRequest): Observable<MetaMensal> {
    return this.http.put<MetaMensal>(`${this.baseUrl}/${request.id}`, request);
  }

  deletarMeta(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}`);
  }
}
