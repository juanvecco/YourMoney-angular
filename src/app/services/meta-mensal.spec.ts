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

  it('sends discriminated percentage and value payloads', () => {
    service.criarMeta({
      nome: 'Investimento',
      tipoDefinicao: 'Percentual',
      percentualReceita: 25,
      valorMeta: null,
      mesReferencia: '2026-06-01'
    }).subscribe();
    const create = httpTesting.expectOne(`${environment.apiUrl}/Metas`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual(jasmine.objectContaining({
      tipoDefinicao: 'Percentual',
      percentualReceita: 25,
      valorMeta: null
    }));
    create.flush({});

    service.atualizarMeta({
      id: 'meta-1',
      nome: 'Reserva',
      tipoDefinicao: 'Valor',
      percentualReceita: null,
      valorMeta: 1000
    }).subscribe();
    const update = httpTesting.expectOne(`${environment.apiUrl}/Metas/meta-1`);
    expect(update.request.method).toBe('PUT');
    expect(update.request.body).toEqual(jasmine.objectContaining({
      tipoDefinicao: 'Valor',
      percentualReceita: null,
      valorMeta: 1000
    }));
    update.flush({});
  });

  it('returns nullable derived percentages and deletes goals', () => {
    service.obterResumo(6, 2026).subscribe(result => {
      expect(result.percentualTotalComprometido).toBeNull();
      expect(result.metas[0].percentualReceita).toBeNull();
      expect(result.metas[0].valorMeta).toBe(1000);
    });
    const summary = httpTesting.expectOne(req => req.url.endsWith('/Metas/resumo'));
    summary.flush({
      mesReferencia: '2026-06-01',
      receitaTotal: 0,
      receitaTotalBruta: 0,
      receitaElegivelMetas: 0,
      receitaExcluidaMetas: 0,
      despesaTotal: 0,
      despesaTotalBruta: 0,
      despesaTotalReembolsada: 0,
      percentualTotalComprometido: null,
      valorTotalReservado: 1000,
      percentualRestante: null,
      valorRestanteAntesDespesas: -1000,
      saldoFinal: -1000,
      valorFaltante: 1000,
      status: 'faltando',
      alertas: [],
      metas: [{
        id: 'meta-1',
        nome: 'Reserva',
        tipoDefinicao: 'Valor',
        percentualReceita: null,
        valorMeta: 1000,
        valorCalculado: 1000,
        mesReferencia: '2026-06-01'
      }]
    });

    service.deletarMeta('meta-1').subscribe();
    const remove = httpTesting.expectOne(`${environment.apiUrl}/Metas/meta-1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });

  it('preserves backend 400, 404, 409 and 500 error contracts', () => {
    service.criarMeta({
      nome: 'Inválida',
      tipoDefinicao: 'Percentual',
      percentualReceita: 20
    }).subscribe({ error: error => expect(error.status).toBe(400) });
    httpTesting.expectOne(`${environment.apiUrl}/Metas`)
      .flush({ message: 'Payload inválido.' }, { status: 400, statusText: 'Bad Request' });

    service.atualizarMeta({
      id: 'ausente',
      nome: 'Ausente',
      tipoDefinicao: 'Percentual',
      percentualReceita: 20
    }).subscribe({ error: error => expect(error.status).toBe(404) });
    httpTesting.expectOne(`${environment.apiUrl}/Metas/ausente`)
      .flush({ message: 'Meta não encontrada.' }, { status: 404, statusText: 'Not Found' });

    service.criarMeta({
      nome: 'Sem base',
      tipoDefinicao: 'Valor',
      valorMeta: 1000
    }).subscribe({ error: error => expect(error.status).toBe(409) });
    httpTesting.expectOne(`${environment.apiUrl}/Metas`)
      .flush({ message: 'Não há receita elegível positiva.' }, { status: 409, statusText: 'Conflict' });

    service.obterResumo(6, 2026)
      .subscribe({ error: error => expect(error.status).toBe(500) });
    httpTesting.expectOne(req => req.url.endsWith('/Metas/resumo'))
      .flush({ message: 'Não foi possível carregar as metas.' }, { status: 500, statusText: 'Server Error' });
  });
});
