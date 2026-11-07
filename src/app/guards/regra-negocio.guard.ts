import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { RegraNegocioService } from '../services/regra-negocio.service';

export const regraNegocioGuard = (codigo: string): CanActivateFn => () => {
  const regras = inject(RegraNegocioService);
  const router = inject(Router);
  const indisponivel = router.createUrlTree(['/configuracao'], { queryParams: { secao: 'regras' } });
  return regras.carregar().pipe(
    map(() => regras.estaAtiva(codigo) ? true : indisponivel),
    catchError(() => of(indisponivel)),
  );
};
