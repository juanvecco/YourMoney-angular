import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import { ApiResponse, AuthData, LoginRequest, RegisterRequest } from '../models/auth.model';
import { environment } from '../../environments/environment';
@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = `${environment.apiUrl}/identidade`;

    constructor(private http: HttpClient) { }

    login(request: LoginRequest): Observable<AuthData> {
        return this.http
            .post<ApiResponse<AuthData>>(
                `${this.apiUrl}/autenticar`,
                request
            )
            .pipe(
                tap(response => this.storeAuthData(response.data)),
                map(response => response.data)
            );
    }

    register(request: RegisterRequest): Observable<AuthData> {
        return this.http
            .post<ApiResponse<AuthData>>(
                `${this.apiUrl}/nova-conta`,
                request
            )
            .pipe(
                tap(response => this.storeAuthData(response.data)),
                map(response => response.data)
            );
    }

    isLoggedIn(): boolean {
        const token = localStorage.getItem('access_token');
        const expiresAt = localStorage.getItem('expires_at');

        return !!token && !!expiresAt && Date.now() < Number(expiresAt);
    }


    logout(): void {
        this.clearAuthData();
    }

    private storeAuthData(auth: AuthData): void {
        this.clearAuthData();
        localStorage.setItem('access_token', auth.accessToken);
        localStorage.setItem(
            'expires_at',
            (Date.now() + auth.expiresIn * 1000).toString()
        );
        localStorage.setItem('user_email', auth.usuarioToken.email);
        localStorage.setItem('username', auth.usuarioToken.nome || '');
    }

    private clearAuthData(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('expires_at');
        localStorage.removeItem('user_email');
        localStorage.removeItem('username');
    }

}

