import { HttpClient } from '@angular/common/http';
import { Injectable, signal } from '@angular/core';
import { catchError, finalize, Observable, of, shareReplay, tap, throwError } from 'rxjs';
import { environment } from '../../environments/environment';
import { RegraNegocio } from '../models/regra-negocio.model';

@Injectable({ providedIn: 'root' })
export class RegraNegocioService {
  private readonly url = `${environment.apiUrl}/regras-negocio`;
  private readonly regrasState = signal<RegraNegocio[] | null>(null);
  readonly regras = this.regrasState.asReadonly();
  private tokenCarregado: string | null = null;
  private carregamento: Observable<RegraNegocio[]> | null = null;

  constructor(private readonly http: HttpClient) {}

  carregar(forcar = false): Observable<RegraNegocio[]> {
    const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('access_token');
    if (token !== this.tokenCarregado) {
      this.regrasState.set(null);
      this.carregamento = null;
      this.tokenCarregado = token;
    }
    if (!forcar && this.regrasState()) return of(this.regrasState()!);
    if (!forcar && this.carregamento) return this.carregamento;

    this.carregamento = this.http.get<RegraNegocio[]>(this.url).pipe(
      tap(regras => this.regrasState.set(regras)),
      catchError(error => {
        this.regrasState.set(null);
        return throwError(() => error);
      }),
      finalize(() => this.carregamento = null),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.carregamento;
  }

  atualizar(codigo: string, ativa: boolean): Observable<RegraNegocio> {
    return this.http.put<RegraNegocio>(`${this.url}/${encodeURIComponent(codigo)}`, { ativa }).pipe(
      tap(regra => {
        const atuais = this.regrasState();
        if (!atuais) return;
        const novas = atuais.map(item => item.codigo === codigo ? regra : item);
        const efetiva = (item: RegraNegocio, visitados = new Set<string>()): boolean => {
          if (visitados.has(item.codigo)) return false;
          visitados.add(item.codigo);
          return item.ativa && item.dependencias.every(codigoPai => {
            const pai = novas.find(candidato => candidato.codigo === codigoPai);
            return !!pai && efetiva(pai, new Set(visitados));
          });
        };
        this.regrasState.set(novas.map(item => ({ ...item, efetiva: efetiva(item) })));
      }),
    );
  }

  estaAtiva(codigo: string): boolean {
    return this.regrasState()?.find(regra => regra.codigo === codigo)?.efetiva === true;
  }
}
