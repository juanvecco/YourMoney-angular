import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CarteiraService } from './carteira';
import { environment } from '../../environments/environment';

describe('CarteiraService', () => {
  let service: CarteiraService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CarteiraService, provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(CarteiraService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('lists and creates private wallets through the API base URL', () => {
    service.listar().subscribe(result => expect(result.length).toBe(1));
    const list = http.expectOne(`${environment.apiUrl}/Carteiras`);
    expect(list.request.method).toBe('GET');
    list.flush([{ id: 'wallet-1', nome: 'Minha carteira', principal: true }]);

    service.criar({ nome: 'Carteira da família' }).subscribe();
    const create = http.expectOne(`${environment.apiUrl}/Carteiras`);
    expect(create.request.method).toBe('POST');
    expect(create.request.body).toEqual({ nome: 'Carteira da família' });
    create.flush({ id: 'wallet-2', nome: 'Carteira da família', principal: false });
  });

  it('renames and removes only the requested wallet', () => {
    service.renomear('wallet-2', { nome: 'Casa' }).subscribe();
    const rename = http.expectOne(`${environment.apiUrl}/Carteiras/wallet-2`);
    expect(rename.request.method).toBe('PUT');
    rename.flush({ id: 'wallet-2', nome: 'Casa', principal: false });

    service.remover('wallet-2').subscribe();
    const remove = http.expectOne(`${environment.apiUrl}/Carteiras/wallet-2`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush(null);
  });
});
