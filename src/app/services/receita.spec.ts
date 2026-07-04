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
      mesReferencia: '2026-05-01',
      natureza: 'RendaDisponivel'
    };
    const response = {
      id: 'receita-1',
      ...payload,
      consideraNasMetas: true,
      despesaVinculadaId: null,
      despesaVinculadaDescricao: null,
      valorAbatidoEmDespesa: 0
    };

    service.criarReceita(payload).subscribe(result => expect(result).toEqual(response));

    const request = httpTesting.expectOne(`${environment.apiUrl}/Receitas`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(payload);
    request.flush(response);
  });

  it('updates receita with classification and linked expense fields', () => {
    const payload = {
      id: 'receita-1',
      descricao: 'Reembolso compra',
      valor: 150,
      data: '2026-07-05',
      mesReferencia: '2026-07-01',
      natureza: 'Reembolso' as const,
      despesaVinculadaId: 'despesa-1'
    };
    const response = {
      ...payload,
      consideraNasMetas: false,
      despesaVinculadaDescricao: 'Compra para terceiro',
      valorAbatidoEmDespesa: 150
    };

    service.atualizarReceita(payload).subscribe(result => expect(result).toEqual(response));

    const request = httpTesting.expectOne(`${environment.apiUrl}/Receitas/receita-1`);
    expect(request.request.method).toBe('PUT');
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
