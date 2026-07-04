import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { MetaMensalService } from './meta-mensal';
import { environment } from '../../environments/environment';

describe('MetaMensalService', () => {
  let service: MetaMensalService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        MetaMensalService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(MetaMensalService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('queries summary by month and year', () => {
    const response = {
      mesReferencia: '2026-07-01',
      receitaTotal: 5000,
      receitaTotalBruta: 5950,
      receitaElegivelMetas: 5000,
      receitaExcluidaMetas: 950,
      despesaTotal: 0,
      despesaTotalBruta: 150,
      despesaTotalReembolsada: 150,
      percentualTotalComprometido: 20,
      valorTotalReservado: 1000,
      percentualRestante: 80,
      valorRestanteAntesDespesas: 4000,
      saldoFinal: 4000,
      valorFaltante: 0,
      status: 'disponivel' as const,
      alertas: [],
      metas: []
    };

    service.obterResumo(7, 2026).subscribe(result => {
      expect(result.receitaElegivelMetas).toBe(5000);
      expect(result.receitaExcluidaMetas).toBe(950);
      expect(result.despesaTotalReembolsada).toBe(150);
    });

    const request = httpTesting.expectOne(req =>
      req.url === `${environment.apiUrl}/Metas/resumo`
      && req.params.get('mes') === '7'
      && req.params.get('ano') === '2026');
    expect(request.request.method).toBe('GET');
    request.flush(response);
  });

  it('creates updates and deletes monthly goals', () => {
    service.criarMeta({ nome: 'Investimento', percentualReceita: 25, mesReferencia: '2026-06-01' }).subscribe();
    const create = httpTesting.expectOne(`${environment.apiUrl}/Metas`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body.percentualReceita).toBe(25);
    create.flush({});

    service.atualizarMeta({ id: 'meta-1', nome: 'Dízimo', percentualReceita: 10 }).subscribe();
    const update = httpTesting.expectOne(`${environment.apiUrl}/Metas/meta-1`);
    expect(update.request.method).toBe('PUT');
    update.flush({});

    service.deletarMeta('meta-1').subscribe();
    const remove = httpTesting.expectOne(`${environment.apiUrl}/Metas/meta-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });
});
