import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { environment } from '../../environments/environment';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('removes only local authentication keys on logout', () => {
    localStorage.setItem('access_token', 'token');
    localStorage.setItem('expires_at', String(Date.now() + 10000));
    localStorage.setItem('user_email', 'user@example.com');
    localStorage.setItem('username', 'legacy-user');
    localStorage.setItem('financial_filter', '2026-05');

    service.logout();

    expect(localStorage.getItem('access_token')).toBeNull();
    expect(localStorage.getItem('expires_at')).toBeNull();
    expect(localStorage.getItem('user_email')).toBeNull();
    expect(localStorage.getItem('username')).toBeNull();
    expect(localStorage.getItem('financial_filter')).toBe('2026-05');
  });

  it('treats missing or partial local authentication state as logged out', () => {
    localStorage.setItem('access_token', 'token-without-expiration');

    expect(service.isLoggedIn()).toBeFalse();
  });

  it('stores authentication data returned by registration', () => {
    service.register({
      nome: 'Maria Silva',
      email: 'maria@example.com',
      senha: 'Senha123',
      senhaConfirmacao: 'Senha123'
    }).subscribe(auth => {
      expect(auth.usuarioToken.email).toBe('maria@example.com');
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/identidade/nova-conta`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body.nome).toBe('Maria Silva');
    request.flush({
      success: true,
      data: {
        accessToken: 'new-token',
        expiresIn: 900,
        usuarioToken: {
          id: 'user-id',
          nome: 'Maria Silva',
          email: 'maria@example.com',
          claims: []
        }
      }
    });

    expect(localStorage.getItem('access_token')).toBe('new-token');
    expect(localStorage.getItem('user_email')).toBe('maria@example.com');
    expect(localStorage.getItem('username')).toBe('Maria Silva');
  });

  it('replaces stale authentication data returned by a previous user on login', () => {
    localStorage.setItem('access_token', 'old-token');
    localStorage.setItem('expires_at', String(Date.now() + 10000));
    localStorage.setItem('user_email', 'old@example.com');
    localStorage.setItem('username', 'Old User');

    service.login({
      email: 'juanvecco@gmail.com',
      senha: 'Senha123'
    }).subscribe(auth => {
      expect(auth.accessToken).toBe('fresh-token');
    });

    const request = httpMock.expectOne(`${environment.apiUrl}/identidade/autenticar`);
    expect(request.request.method).toBe('POST');
    request.flush({
      success: true,
      data: {
        accessToken: 'fresh-token',
        expiresIn: 900,
        usuarioToken: {
          id: '3c3e04ec-651e-4de3-8e7a-5dc6f47c2a10',
          nome: 'Juan',
          email: 'juanvecco@gmail.com',
          claims: []
        }
      }
    });

    expect(localStorage.getItem('access_token')).toBe('fresh-token');
    expect(localStorage.getItem('user_email')).toBe('juanvecco@gmail.com');
    expect(localStorage.getItem('username')).toBe('Juan');
  });

  it('clears stale username when the latest login does not return one', () => {
    localStorage.setItem('username', 'Old User');

    service.login({
      email: 'user@example.com',
      senha: 'Senha123'
    }).subscribe();

    const request = httpMock.expectOne(`${environment.apiUrl}/identidade/autenticar`);
    request.flush({
      success: true,
      data: {
        accessToken: 'token-without-name',
        expiresIn: 900,
        usuarioToken: {
          id: 'user-id',
          nome: '',
          email: 'user@example.com',
          claims: []
        }
      }
    });

    expect(localStorage.getItem('access_token')).toBe('token-without-name');
    expect(localStorage.getItem('user_email')).toBe('user@example.com');
    expect(localStorage.getItem('username')).toBe('');
  });
});
