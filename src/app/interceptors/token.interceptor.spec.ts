import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tokenInterceptor } from './token.interceptor';
import { AuthService } from '../services/auth.service';

describe('tokenInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    localStorage.clear();
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([tokenInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
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

  it('uses the latest access_token value for every request', () => {
    localStorage.setItem('access_token', 'old-token');

    http.get('/api/private').subscribe();

    const firstRequest = httpMock.expectOne('/api/private');
    expect(firstRequest.request.headers.get('Authorization')).toBe('Bearer old-token');
    firstRequest.flush({});

    localStorage.setItem('access_token', 'fresh-token');

    http.get('/api/private').subscribe();

    const secondRequest = httpMock.expectOne('/api/private');
    expect(secondRequest.request.headers.get('Authorization')).toBe('Bearer fresh-token');
    secondRequest.flush({});
  });

  it('does not add bearer token after logout cleanup removes access_token', () => {
    http.get('/api/private').subscribe();

    const req = httpMock.expectOne('/api/private');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('calls logout and redirects to login on 401 responses', () => {
    http.get('/api/private').subscribe({
      error: (error: HttpErrorResponse) => {
        expect(error.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/api/private');
    req.flush({}, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
