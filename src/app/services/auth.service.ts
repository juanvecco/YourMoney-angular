import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap, map } from 'rxjs';
import {
    ApiResponse, AuthData, LoginRequest, PasswordResetConfirmRequest,
    PasswordResetMessage, PasswordResetRequest, RegisterRequest,
    ExternalMethods, InviteValidation, RegistrationInvite, RegistrationInviteSummary, OnboardingGoal,
    ExternalAccountLinkStatus, PendingGoogleLink, PrepareGoogleLinkResponse
} from '../models/auth.model';
import { environment } from '../../environments/environment';
import { FinancialNavigationContextService } from './financial-navigation-context.service';
import { DespesaService } from './despesa';
@Injectable({ providedIn: 'root' })
export class AuthService {
    private apiUrl = `${environment.apiUrl}/identidade`;

    constructor(
        private http: HttpClient,
        private financialContext: FinancialNavigationContextService,
        private despesaService: DespesaService
    ) { }

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

    getExternalMethods(): Observable<ExternalMethods> {
        return this.http.get<ExternalMethods>(`${this.apiUrl}/metodos`);
    }

    validateInvite(codigo: string): Observable<InviteValidation> {
        return this.http.get<InviteValidation>(`${this.apiUrl}/convites/validar`, { params: { codigo } });
    }

    createInvite(): Observable<RegistrationInvite> {
        return this.http.post<RegistrationInvite>(`${this.apiUrl}/convites`, {});
    }

    listInvites(): Observable<RegistrationInviteSummary[]> {
        return this.http.get<RegistrationInviteSummary[]>(`${this.apiUrl}/convites`);
    }

    revokeInvite(id: string): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/convites/${encodeURIComponent(id)}/revogar`, {});
    }

    startExternalLogin(provider: 'google' | 'apple', data: { nome: string; objetivoInicial: OnboardingGoal; objetivosIniciais: OnboardingGoal[]; origemConhecimento?: string; codigoConvite?: string }): void {
        this.submitExternalLogin(provider, data);
    }

    startExistingExternalLogin(provider: 'google' | 'apple'): void {
        this.submitExternalLogin(provider, { modoEntrar: 'true' });
    }

    private submitExternalLogin(provider: 'google' | 'apple', data: Record<string, string | string[] | undefined>): void {
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `${this.apiUrl}/externo/iniciar/${provider}`;
        for (const [name, value] of Object.entries(data)) {
            if (!value) continue;
            for (const item of Array.isArray(value) ? value : [value]) {
                const field = document.createElement('input');
                field.type = 'hidden';
                field.name = name;
                field.value = item;
                form.appendChild(field);
            }
        }
        document.body.appendChild(form);
        form.submit();
    }

    completeExternalLogin(): Observable<AuthData> {
        return this.http.post<ApiResponse<AuthData>>(`${this.apiUrl}/externo/concluir`, {}, { withCredentials: true })
            .pipe(tap(response => this.storeAuthData(response.data)), map(response => response.data));
    }

    getExternalAccountLinkStatus(): Observable<ExternalAccountLinkStatus> {
        return this.http.get<ApiResponse<ExternalAccountLinkStatus>>(`${this.apiUrl}/vinculos`)
            .pipe(map(response => response.data));
    }

    prepareGoogleLink(senhaAtual: string): Observable<PrepareGoogleLinkResponse> {
        return this.http.post<ApiResponse<PrepareGoogleLinkResponse>>(
            `${this.apiUrl}/vincular/google/preparar`, { senhaAtual }, { withCredentials: true }
        ).pipe(map(response => response.data));
    }

    startGoogleLink(continuationPath: string): void {
        const expectedPath = '/api/identidade/externo/vincular/google/iniciar';
        if (continuationPath !== expectedPath) throw new Error('Caminho de continuação inválido.');
        const form = document.createElement('form');
        form.method = 'POST';
        const apiBaseUrl = new URL(environment.apiUrl, window.location.origin);
        form.action = new URL(continuationPath, apiBaseUrl).toString();
        document.body.appendChild(form);
        form.submit();
    }

    getPendingGoogleLink(): Observable<PendingGoogleLink> {
        return this.http.get<ApiResponse<PendingGoogleLink>>(
            `${this.apiUrl}/vincular/google/pendente`, { withCredentials: true }
        ).pipe(map(response => response.data));
    }

    confirmGoogleLink(): Observable<ExternalAccountLinkStatus> {
        return this.http.post<ApiResponse<ExternalAccountLinkStatus>>(
            `${this.apiUrl}/vincular/google/confirmar`, {}, { withCredentials: true }
        ).pipe(map(response => response.data));
    }

    cancelGoogleLink(): Observable<void> {
        return this.http.post<void>(`${this.apiUrl}/vincular/google/cancelar`, {}, { withCredentials: true });
    }

    requestPasswordReset(request: PasswordResetRequest): Observable<PasswordResetMessage> {
        return this.http.post<ApiResponse<PasswordResetMessage>>(
            this.apiUrl + '/esqueci-minha-senha',
            request
        ).pipe(map(response => response.data));
    }

    resetPassword(request: PasswordResetConfirmRequest): Observable<PasswordResetMessage> {
        return this.http.post<ApiResponse<PasswordResetMessage>>(
            this.apiUrl + '/resetar-senha',
            request
        ).pipe(map(response => response.data));
    }

    isLoggedIn(): boolean {
        const token = localStorage.getItem('access_token');
        const expiresAt = localStorage.getItem('expires_at');

        return !!token && !!expiresAt && Date.now() < Number(expiresAt);
    }

    isAdmin(): boolean {
        if (!this.isLoggedIn()) return false;
        try {
            const roles = JSON.parse(localStorage.getItem('user_roles') ?? '[]');
            if (Array.isArray(roles) && roles.includes('Admin')) return true;
            const payload = localStorage.getItem('access_token')?.split('.')[1];
            if (!payload) return false;
            const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
            const claims = JSON.parse(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')));
            const tokenRoles = claims.role;
            return tokenRoles === 'Admin' || (Array.isArray(tokenRoles) && tokenRoles.includes('Admin'));
        } catch {
            return false;
        }
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
        localStorage.setItem('user_roles', JSON.stringify(auth.usuarioToken.roles ?? []));
    }

    private clearAuthData(): void {
        localStorage.removeItem('access_token');
        localStorage.removeItem('expires_at');
        localStorage.removeItem('user_email');
        localStorage.removeItem('username');
        localStorage.removeItem('user_roles');
        this.financialContext.resetPrivateContext();
        this.despesaService.clearUserCache();
    }

}

