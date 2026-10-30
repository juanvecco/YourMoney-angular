import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { environment } from '../../environments/environment';
import { InvestimentoGrupoService } from './investimento-grupo';

describe('InvestimentoGrupoService', () => {
  let service: InvestimentoGrupoService;
  let http: HttpTestingController;
  const baseUrl = `${environment.apiUrl}/InvestimentoGrupos`;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [InvestimentoGrupoService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(InvestimentoGrupoService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('uses typed owner-derived CRUD requests without usuarioId', () => {
    service.listar().subscribe();
    http.expectOne(baseUrl).flush([]);
    service.criar({ nome: 'Reserva' }).subscribe();
    const create = http.expectOne(baseUrl);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ nome: 'Reserva' });
    expect(create.request.body.usuarioId).toBeUndefined();
    create.flush({ id: 'g1', nome: 'Reserva', versao: 'AQ==', quantidadeInvestimentos: 0 });
    service.renomear('g1', { nome: 'Renda', versao: 'AQ==' }).subscribe();
    const rename = http.expectOne(`${baseUrl}/g1`);
    expect(rename.request.body.versao).toBe('AQ==');
    rename.flush({});
  });

  it('sends the atomic exclusion command with current versions', () => {
    const command = { versaoOrigem: 'AQ==', acaoVinculos: 'Transferir' as const, grupoDestinoId: 'g2', versaoDestino: 'Ag==' };
    service.excluir('g1', command).subscribe();
    const request = http.expectOne(`${baseUrl}/g1/exclusao`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual(command);
    expect(request.request.body.usuarioId).toBeUndefined();
    request.flush(null);
  });

  it('uploads an objective image as multipart form data', () => {
    const file = new File([new Uint8Array([0x89, 0x50])], 'goal.png', { type: 'image/png' });
    service.enviarImagem(file).subscribe(response => expect(response.imagemUrl).toContain('/uploads/objetivos/'));

    const request = http.expectOne(`${baseUrl}/imagens`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body instanceof FormData).toBeTrue();
    const uploaded = (request.request.body as FormData).get('imagem') as File;
    expect(uploaded.name).toBe('goal.png');
    expect(uploaded.type).toBe('image/png');
    expect(uploaded.size).toBe(file.size);
    request.flush({ imagemUrl: '/uploads/objetivos/goal.png' });
  });
});
