import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { DespesaRecorrenteService } from './despesa-recorrente';
import { environment } from '../../environments/environment';

describe('DespesaRecorrenteService', () => {
  let service: DespesaRecorrenteService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/DespesasRecorrentes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DespesaRecorrenteService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(DespesaRecorrenteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('lists suggestions for a month using query params', () => {
    const response = {
      mes: 5,
      ano: 2026,
      itens: [
        {
          ocorrenciaId: 'ocorrencia-1',
          despesaRecorrenteId: 'recorrencia-1',
          mesReferencia: '2026-05-01',
          status: 'Pendente' as const,
          descricao: 'Internet',
          valorPrevisto: 100,
          dataSugerida: '2026-05-10',
          idContaFinanceira: 'conta-1',
          contaDescricao: 'Conta Principal',
          idTipoDespesa: 'tipo-essencial',
          idNaturezaDespesa: 'natureza-moradia',
          idCategoria: 'natureza-moradia',
          despesaConfirmadaId: null
        }
      ]
    };

    service.listarSugestoes(5, 2026).subscribe(result => {
      expect(result).toEqual(response);
      expect(result.itens[0].status).toBe('Pendente');
    });

    const req = httpMock.expectOne(request =>
      request.url === `${baseUrl}/sugestoes`
    );
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('mes')).toBe('5');
    expect(req.request.params.get('ano')).toBe('2026');
    req.flush(response);
  });

  it('posts edited confirmation payload to suggestion endpoint', () => {
    const request = {
      descricao: 'Internet ajustada',
      valor: 110,
      data: '2026-05-12',
      idContaFinanceira: 'conta-2',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia',
      idCategoria: 'natureza-moradia'
    };
    const response = {
      id: 'despesa-1',
      descricao: 'Internet ajustada',
      valor: 110,
      data: '2026-05-12',
      mesReferencia: '2026-05-01',
      idContaFinanceira: 'conta-2',
      idCategoria: 'natureza-moradia'
    };

    service.confirmarSugestao('ocorrencia-1', request).subscribe(result => {
      expect(result).toEqual(response);
    });

    const req = httpMock.expectOne(`${baseUrl}/sugestoes/ocorrencia-1/confirmar`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    req.flush(response);
  });

  it('calls recurrence maintenance endpoints with typed payloads', () => {
    const request = {
      descricao: 'Internet',
      valorPrevisto: 100,
      idContaFinanceira: 'conta-1',
      idTipoDespesa: 'tipo-essencial',
      idNaturezaDespesa: 'natureza-moradia',
      idCategoria: 'natureza-moradia',
      dataVencimento: '2026-05-10',
      dataInicio: '2026-05-01',
      dataTermino: null
    };
    const response = {
      id: 'recorrencia-1',
      ...request,
      contaDescricao: 'Conta Principal',
      tipoDescricao: 'Essencial',
      naturezaDescricao: 'Moradia',
      categoriaDescricao: 'Moradia',
      diaVencimento: 10,
      ativa: true
    };

    service.atualizar('recorrencia-1', request).subscribe(result => {
      expect(result.id).toBe('recorrencia-1');
    });
    const put = httpMock.expectOne(`${baseUrl}/recorrencia-1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body).toEqual(request);
    put.flush(response);

    service.encerrar('recorrencia-1', { dataTermino: '2026-06-30' }).subscribe();
    const patchEnd = httpMock.expectOne(`${baseUrl}/recorrencia-1/encerrar`);
    expect(patchEnd.request.method).toBe('PATCH');
    expect(patchEnd.request.body).toEqual({ dataTermino: '2026-06-30' });
    patchEnd.flush({ ...response, dataTermino: '2026-06-30' });

    service.desativar('recorrencia-1').subscribe();
    const patchDeactivate = httpMock.expectOne(`${baseUrl}/recorrencia-1/desativar`);
    expect(patchDeactivate.request.method).toBe('PATCH');
    expect(patchDeactivate.request.body).toEqual({});
    patchDeactivate.flush(null);
  });
});
