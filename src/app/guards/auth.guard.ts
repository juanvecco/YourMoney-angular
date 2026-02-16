import { Injectable } from '@angular/core';
import {
    CanActivate,
    Router,
    ActivatedRouteSnapshot,
    RouterStateSnapshot
} from '@angular/router';
import { AuthService } from '../services/auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

    constructor(
        private authService: AuthService,
        private router: Router
    ) { }

    canActivate(
        route: ActivatedRouteSnapshot,
        state: RouterStateSnapshot
    ): boolean {

        if (this.authService.isLoggedIn()) {
            return true;
        }

        // Token inválido ou expirado → limpa sessão
        this.authService.logout();

        // Redireciona para login mantendo URL de retorno
        this.router.navigate(['/login'], {
            queryParams: { returnUrl: state.url }
        });

        return false;
    }
}
