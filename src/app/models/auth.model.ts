export interface LoginRequest {
    email: string;
    senha: string;
}

export interface RegisterRequest {
    nome: string;
    objetivoInicial: OnboardingGoal;
    email: string;
    senha: string;
    senhaConfirmacao: string;
    origemConhecimento?: string;
    codigoConvite?: string;
}

export type OnboardingGoal = 'gastos' | 'cartao' | 'objetivos' | 'saldo';
export type ReferralSource = 'instagram' | 'google-play' | 'amigo-familiar' | 'tiktok' | 'google' | 'facebook' | 'youtube' | 'linkedin' | 'outro' | 'prefiro-nao-responder';
export interface ExternalMethods { google: boolean; apple: boolean; }
export interface InviteValidation { valido: boolean; motivo?: string | null; }
export interface RegistrationInvite { codigo: string; link: string; expiraEm: string; }
export interface RegistrationInviteSummary { id: string; expiraEm: string; usadoEm?: string | null; usadoPorEmail?: string | null; revogado: boolean; }

export interface PasswordResetRequest {
    email: string;
}

export interface PasswordResetConfirmRequest {
    email: string;
    token: string;
    senha: string;
    senhaConfirmacao: string;
}

export interface PasswordResetMessage {
    mensagem: string;
}

export interface AuthResponse {
    token: string;
    refreshToken: string;
    expiration: Date;
    username: string;
}
export interface ApiResponse<T> {
    success: boolean;
    data: T;
}

export interface AuthData {
    accessToken: string;
    expiresIn: number;
    usuarioToken: {
        id: string;
        nome?: string;
        email: string;
        roles?: string[];
        claims: { type: string; value: string }[];
    };
}
