import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { firstValueFrom, Observable, of } from 'rxjs';
import { RegraNegocioService } from '../services/regra-negocio.service';
import { regraNegocioGuard } from './regra-negocio.guard';

describe('regraNegocioGuard', () => {
  it('redirects a disabled optional route to Configurações', async () => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: RegraNegocioService, useValue: { carregar: () => of([]), estaAtiva: () => false } },
      ],
    });
    const result = TestBed.runInInjectionContext(() =>
      regraNegocioGuard('openfinance.visivel')({} as never, {} as never));
    const resolved = await firstValueFrom(result as Observable<UrlTree | boolean>);
    expect(resolved instanceof UrlTree).toBeTrue();
    expect(TestBed.inject(Router).serializeUrl(resolved as UrlTree)).toBe('/configuracao?secao=regras');
  });
});
