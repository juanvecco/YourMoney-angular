import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { tokenInterceptor } from './token.interceptor';
import { AuthService } from '../services/auth.service';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    localStorage.clear();
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('adds bearer token when access_token exists', () => {
    localStorage.setItem('access_token', 'abc123');

    http.get('/api/private').subscribe();

    const req = httpMock.expectOne('/api/private');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc123');
    req.flush({});
  });

  it('does not add bearer token after logout cleanup removes access_token', () => {
    http.get('/api/private').subscribe();

    const req = httpMock.expectOne('/api/private');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('calls logout on 401 responses', () => {
    http.get('/api/private').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/api/private');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalled();
  });
});
