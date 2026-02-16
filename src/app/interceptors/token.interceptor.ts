// import { HttpInterceptorFn, HttpErrorResponse, HttpEvent, HttpRequest, HttpHandlerFn } from '@angular/common/http';
// import { inject } from '@angular/core';
// import { Observable, throwError, BehaviorSubject } from 'rxjs';
// import { catchError, filter, switchMap, take } from 'rxjs/operators';
// import { AuthService } from '../services/auth.service';

// export const tokenInterceptor: HttpInterceptorFn = (
//     request: HttpRequest<any>,
//     next: HttpHandlerFn
// ): Observable<HttpEvent<any>> => {

//     const authService = inject(AuthService);

//     // Controle de refresh
//     let isRefreshing = false;
//     const refreshTokenSubject = new BehaviorSubject<any>(null);

//     // Função para adicionar token
//     const addToken = (req: HttpRequest<any>, token: string) => {
//         return req.clone({
//             setHeaders: { Authorization: `Bearer ${token}` }
//         });
//     };

//     // Função para tratar 401
//     const handle401Error = () => {
//         if (!isRefreshing) {
//             isRefreshing = true;
//             refreshTokenSubject.next(null);

//             return authService.refreshToken().pipe(
//                 switchMap((token: any) => {
//                     isRefreshing = false;
//                     refreshTokenSubject.next(token.token);
//                     return next(addToken(request, token.token));
//                 }),
//                 catchError(err => {
//                     isRefreshing = false;
//                     authService.logout();
//                     return throwError(() => err);
//                 })
//             );
//         }

//         // Caso já esteja atualizando
//         return refreshTokenSubject.pipe(
//             filter(token => token != null),
//             take(1),
//             switchMap(jwt => next(addToken(request, jwt)))
//         );
//     };

//     // Adiciona token inicial
//     const accessToken = authService.getAccessToken();
//     if (accessToken) {
//         request = addToken(request, accessToken);
//     }

//     // Continua a requisição
//     return next(request).pipe(
//         catchError((error: any) => {
//             if (error instanceof HttpErrorResponse && error.status === 401) {
//                 return handle401Error();
//             }
//             return throwError(() => error);
//         })
//     );
// };
