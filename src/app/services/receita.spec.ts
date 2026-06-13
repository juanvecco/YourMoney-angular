import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ReceitaService } from './receita';
import { environment } from '../../environments/environment';
import { CriarReceitaRequest } from '../models/receita.model';

describe('ReceitaService', () => {
  let service: ReceitaService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ReceitaService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(ReceitaService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('creates receita with effective date and reference month', () => {
    const payload: CriarReceitaRequest = {
      descricao: 'Salário',
      valor: 5250.75,
      data: '2026-06-05',
      mesReferencia: '2026-05-01'
    };
    const response = { id: 'receita-1', ...payload };

    service.criarReceita(payload).subscribe(result => expect(result).toEqual(response));

    const request = httpTesting.expectOne(`${environment.apiUrl}/Receitas`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(response);
  });

  it('queries receitas by selected reference', () => {
    service.obterPorReferencia(5, 2026).subscribe();

    const request = httpTesting.expectOne(
      req => req.url === `${environment.apiUrl}/Receitas/por-referencia`
        && req.params.get('mes') === '5'
        && req.params.get('ano') === '2026'
    );
    expect(request.request.method).toBe('GET');
    request.flush([]);
  });
});
