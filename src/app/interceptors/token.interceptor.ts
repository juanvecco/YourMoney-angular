import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const tokenInterceptor: HttpInterceptorFn = (request, next) => {
    const authService = inject(AuthService);
    const accessToken = localStorage.getItem('access_token');

    const authenticatedRequest = accessToken
        ? request.clone({
            setHeaders: { Authorization: `Bearer ${accessToken}` }
        })
        : request;

    return next(authenticatedRequest).pipe(
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                authService.logout();
            }

            return throwError(() => error);
        })
    );
};
