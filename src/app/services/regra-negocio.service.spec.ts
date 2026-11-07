import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { RegraNegocio } from '../models/regra-negocio.model';
import { RegraNegocioService } from './regra-negocio.service';

describe('RegraNegocioService', () => {
  let service: RegraNegocioService;
  let http: HttpTestingController;
  const url = `${environment.apiUrl}/regras-negocio`;
  const renda: RegraNegocio = {
    codigo: 'receitas.recorrencia', nome: 'Recorrência de receitas', descricao: 'Sugestões mensais',
    grupo: 'Receitas', ativa: true, efetiva: true, dependencias: [],
  };
  const reserva: RegraNegocio = {
    codigo: 'receitas.reserva-emergencia', nome: 'Reserva', descricao: 'Projeção',
    grupo: 'Planejamento', ativa: true, efetiva: true, dependencias: ['receitas.recorrencia'],
  };

  beforeEach(() => {
    localStorage.setItem('access_token', 'usuario-a');
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(RegraNegocioService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.removeItem('access_token');
  });

  it('loads choices and makes dependent rules ineffective when the parent is off', () => {
    service.carregar().subscribe();
    http.expectOne(url).flush([renda, reserva]);
    expect(service.estaAtiva('receitas.reserva-emergencia')).toBeTrue();

    service.atualizar('receitas.recorrencia', false).subscribe();
    const req = http.expectOne(`${url}/receitas.recorrencia`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ ativa: false });
    req.flush({ ...renda, ativa: false, efetiva: false });
    expect(service.estaAtiva('receitas.reserva-emergencia')).toBeFalse();
  });

  it('clears cached choices when another session signs in', () => {
    service.carregar().subscribe();
    http.expectOne(url).flush([renda]);
    localStorage.setItem('access_token', 'usuario-b');
    service.carregar().subscribe();
    expect(service.estaAtiva('receitas.recorrencia')).toBeFalse();
    http.expectOne(url).flush([{ ...renda, ativa: false, efetiva: false }]);
    expect(service.estaAtiva('receitas.recorrencia')).toBeFalse();
  });
});
