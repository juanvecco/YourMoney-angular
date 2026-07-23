import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { ReceitaRecorrenteService } from './receita-recorrente';

describe('ReceitaRecorrenteService', () => {
  let service: ReceitaRecorrenteService;
  let httpMock: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/ReceitasRecorrentes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ReceitaRecorrenteService, provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ReceitaRecorrenteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('uses typed CRUD and keeps salary and reserve flags independent', () => {
    const payload = {
      descricao: 'Salário principal',
      valorPrevisto: 5000,
      idContaFinanceira: 'conta-1',
      natureza: 'RendaDisponivel' as const,
      ehSalario: true,
      consideraReservaEmergencia: false,
      dataRecebimento: '2026-07-05',
      dataInicio: '2026-07-01',
      dataTermino: null
    };

    service.criar(payload).subscribe();
    const post = httpMock.expectOne(baseUrl);
    expect(post.request.method).toBe('POST');
    expect(post.request.body.ehSalario).toBeTrue();
    expect(post.request.body.consideraReservaEmergencia).toBeFalse();
    post.flush({ id: 'rec-1', ...payload, contaDescricao: 'Principal', diaRecebimento: 5, ativa: true });

    service.atualizar('rec-1', { ...payload, consideraReservaEmergencia: true }).subscribe();
    const put = httpMock.expectOne(`${baseUrl}/rec-1`);
    expect(put.request.method).toBe('PUT');
    expect(put.request.body.consideraReservaEmergencia).toBeTrue();
    put.flush({ id: 'rec-1', ...payload, consideraReservaEmergencia: true, contaDescricao: 'Principal', diaRecebimento: 5, ativa: true });
  });

  it('lists suggestions and sends confirmation and ignore requests', () => {
    service.listarSugestoes(7, 2026).subscribe();
    const list = httpMock.expectOne(req => req.url === `${baseUrl}/sugestoes`);
    expect(list.request.params.get('mes')).toBe('7');
    expect(list.request.params.get('ano')).toBe('2026');
    list.flush({ mes: 7, ano: 2026, itens: [] });

    const payload = { descricao: 'Salário ajustado', valor: 5100 };
    service.confirmarSugestao('oc-1', payload).subscribe();
    const confirm = httpMock.expectOne(`${baseUrl}/sugestoes/oc-1/confirmar`);
    expect(confirm.request.method).toBe('POST');
    expect(confirm.request.body).toEqual(payload);
    confirm.flush({});

    service.ignorarSugestao('oc-1').subscribe();
    const ignore = httpMock.expectOne(`${baseUrl}/sugestoes/oc-1/ignorar`);
    expect(ignore.request.method).toBe('POST');
    ignore.flush(null);
  });

  it('loads individual emergency reserve projections', () => {
    service.obterProjecaoReserva().subscribe(response => {
      expect(response.itens[0].valorSeisMeses).toBe(30000);
      expect(response.itens[0].valorDozeMeses).toBe(60000);
    });

    const request = httpMock.expectOne(`${baseUrl}/reserva-emergencia`);
    expect(request.request.method).toBe('GET');
    request.flush({
      itens: [{
        receitaRecorrenteId: 'rec-1',
        descricao: 'Salário principal',
        contaDescricao: 'Principal',
        ehSalario: true,
        valorMensal: 5000,
        valorSeisMeses: 30000,
        valorDozeMeses: 60000
      }]
    });
  });

  it('lists only the minimal eligible salary lookup', () => {
    service.listarElegiveisParaInvestimento().subscribe(response => expect(response.itens.length).toBe(1));
    const request = httpMock.expectOne(`${baseUrl}/elegiveis-para-investimento`);
    expect(request.request.method).toBe('GET');
    request.flush({ itens: [{ id: 'salario-1', descricao: 'Salário', contaDescricao: 'Principal', valorPrevisto: 5000 }] });
  });
});
