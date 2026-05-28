import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let service: AuthService;

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
  });

  afterEach(() => {
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
});
