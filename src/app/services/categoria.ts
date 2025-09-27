import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { environment } from '../../environments/environment';

export interface CriarCategoriaComponent {
    listarCategorias(): Observable<Categoria[]>;
    criarCategoria(categoria: Categoria): Observable<Categoria>;
    atualizarCategoria(categoria: Categoria): Observable<Categoria>;
}

@Injectable({
    providedIn: 'root'
})
export class CategoriaService implements CriarCategoriaComponent {
    private apiUrl = `${environment.apiUrl}/categoria`;

    constructor(private http: HttpClient) { }

    listarCategorias(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(this.apiUrl);
    }

    criarCategoria(categoria: Categoria): Observable<Categoria> {
        return this.http.post<Categoria>(this.apiUrl, categoria);
    }

    atualizarCategoria(categoria: Categoria): Observable<Categoria> {
        return this.http.put<Categoria>(`${this.apiUrl}/${categoria.id}`, categoria);
    }
}
export interface Categoria {
    id: string;
    nome: string;
    categoriaPaiId: string | null;
}