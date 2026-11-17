import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminUsuariosService } from './admin-usuarios.service';
import { environment } from '../../environments/environment';

describe('AdminUsuariosService', () => {
  it('requests only the paged administrator endpoint', () => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    const service = TestBed.inject(AdminUsuariosService);
    const http = TestBed.inject(HttpTestingController);
    service.listar(2, 'maria@example.com').subscribe(result => {
      expect(result.itens).toEqual([{ id: '1', nome: 'Maria', email: 'maria@example.com' }]);
    });
    const request = http.expectOne(req => req.url === `${environment.apiUrl}/admin/usuarios`);
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('pagina')).toBe('2');
    expect(request.request.params.get('busca')).toBe('maria@example.com');
    request.flush({ itens: [{ id: '1', nome: 'Maria', email: 'maria@example.com' }], pagina: 2, tamanho: 25, total: 26, redefinicaoDisponivel: false });
    http.verify();
  });
});
