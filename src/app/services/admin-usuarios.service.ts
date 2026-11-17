import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface UsuarioAdmin {
  id: string;
  nome: string;
  email: string;
}

export interface PaginaUsuariosAdmin {
  itens: UsuarioAdmin[];
  pagina: number;
  tamanho: number;
  total: number;
  redefinicaoDisponivel: boolean;
}

@Injectable({ providedIn: 'root' })
export class AdminUsuariosService {
  constructor(private readonly http: HttpClient) {}

  listar(pagina: number, busca: string): Observable<PaginaUsuariosAdmin> {
    let params = new HttpParams().set('pagina', pagina).set('tamanho', 25);
    if (busca.trim()) params = params.set('busca', busca.trim());
    return this.http.get<PaginaUsuariosAdmin>(`${environment.apiUrl}/admin/usuarios`, { params });
  }
}
