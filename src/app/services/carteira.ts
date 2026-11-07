import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Carteira, CarteiraRequest } from '../models/carteira.model';

@Injectable({ providedIn: 'root' })
export class CarteiraService {
  private readonly baseUrl = environment.apiUrl + '/Carteiras';

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Carteira[]> { return this.http.get<Carteira[]>(this.baseUrl); }
  criar(request: CarteiraRequest): Observable<Carteira> { return this.http.post<Carteira>(this.baseUrl, request); }
  renomear(id: string, request: CarteiraRequest): Observable<Carteira> {
    return this.http.put<Carteira>(`${this.baseUrl}/${id}`, request);
  }
  remover(id: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`); }
}
