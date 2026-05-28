import { TestBed } from '@angular/core/testing';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { AuthGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['isLoggedIn', 'logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });

    guard = TestBed.inject(AuthGuard);
  });

  it('allows private routes when the user is logged in', () => {
    authService.isLoggedIn.and.returnValue(true);

    const result = guard.canActivate({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot);

    expect(result).toBeTrue();
    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('clears auth state and redirects to login when the session is invalid', () => {
    authService.isLoggedIn.and.returnValue(false);

    const result = guard.canActivate({} as ActivatedRouteSnapshot, { url: '/dashboard' } as RouterStateSnapshot);

    expect(result).toBeFalse();
    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/dashboard' }
    });
  });
});
