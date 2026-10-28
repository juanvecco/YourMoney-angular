import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { AlocarAporteObjetivoRequest, AporteObjetivo, ConfirmarAporteObjetivoRequest } from '../models/aporte-objetivo.model';

@Injectable({ providedIn: 'root' })
export class AporteObjetivoService {
  private readonly baseUrl = `${environment.apiUrl}/Metas`;
  constructor(private readonly http: HttpClient) {}
  listar(metaId: string): Observable<AporteObjetivo[]> { return this.http.get<AporteObjetivo[]>(`${this.baseUrl}/${metaId}/aportes`); }
  confirmar(metaId: string, request: ConfirmarAporteObjetivoRequest): Observable<AporteObjetivo> {
    return this.http.post<AporteObjetivo>(`${this.baseUrl}/${metaId}/aportes`, request);
  }
  alocar(metaId: string, aporteId: string, request: AlocarAporteObjetivoRequest): Observable<AporteObjetivo> {
    return this.http.put<AporteObjetivo>(`${this.baseUrl}/${metaId}/aportes/${aporteId}/alocacao`, request);
  }
}
