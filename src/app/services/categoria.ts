import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../environments/environment';
import { Categoria } from '../models/despesa.model';

export type CategoriaPayload = Omit<Categoria, 'id'>;

@Injectable({
    providedIn: 'root'
})
export class CategoriaService {
    private apiUrl = `${environment.apiUrl}/Categoria`;

    constructor(private http: HttpClient) { }

    listarCategorias(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(this.apiUrl);
    }

    criarCategoria(categoria: CategoriaPayload): Observable<Categoria> {
        return this.http.post<Categoria>(this.apiUrl, categoria);
    }

    atualizarCategoria(id: string, categoria: CategoriaPayload): Observable<Categoria> {
        return this.http.put<Categoria>(`${this.apiUrl}/${id}`, categoria);
    }

    removerCategoria(id: string): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`);
    }
}
