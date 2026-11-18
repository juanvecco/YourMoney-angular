import { HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { finalize, Observable, shareReplay } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class InFlightApiGets {
  private readonly pending = new Map<string, Observable<HttpEvent<unknown>>>();
  private generation = 0;

  handle(request: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
    const apiPrefix = `${environment.apiUrl.replace(/\/$/, '')}/`;
    if (!request.url.startsWith(apiPrefix)) return next(request);

    if (request.method !== 'GET') {
      if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) this.generation++;
      return next(request);
    }

    // Contexto e eventos de progresso podem variar entre chamadores; não compartilhe esses fluxos.
    if (request.reportProgress || Array.from(request.context.keys()).length) return next(request);

    const token = typeof localStorage === 'undefined' ? null : localStorage.getItem('access_token');
    const headers = request.headers.keys().sort().map(name => [name, request.headers.getAll(name)]);
    const key = JSON.stringify([
      this.generation, request.urlWithParams, token, request.responseType, request.withCredentials, headers
    ]);
    const existing = this.pending.get(key);
    if (existing) return existing;

    const shared = next(request).pipe(
      finalize(() => {
        if (this.pending.get(key) === shared) this.pending.delete(key);
      }),
      shareReplay({ bufferSize: 1, refCount: true })
    );
    this.pending.set(key, shared);
    return shared;
  }
}

export const dedupeGetInterceptor: HttpInterceptorFn = (request, next) =>
  inject(InFlightApiGets).handle(request, next);
