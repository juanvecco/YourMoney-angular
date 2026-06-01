export interface LoginRequest {
    email: string;
    senha: string;
}

export interface RegisterRequest {
    nome: string;
    email: string;
    senha: string;
    senhaConfirmacao: string;
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
        claims: { type: string; value: string }[];
    };
}
