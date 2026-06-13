import { Subject, of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { ReceitaPageComponent } from './receita-page';
import { ReceitaService } from '../../../services/receita';
import { AuthService } from '../../../services/auth.service';
import Swal from 'sweetalert2';
import { CriarReceitaResponse } from '../../../models/receita.model';

describe('ReceitaPageComponent', () => {
  let component: ReceitaPageComponent;
  let receitaService: jasmine.SpyObj<ReceitaService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    receitaService = jasmine.createSpyObj<ReceitaService>('ReceitaService', [
      'obterPorReferencia',
      'criarReceita',
      'atualizarReceita',
      'deletarReceita'
    ]);
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    receitaService.obterPorReferencia.and.returnValue(of([]));
    (window as any).bootstrap = {
      Modal: {
        getInstance: () => ({ hide: () => undefined })
      }
    };

    component = new ReceitaPageComponent(receitaService, authService, router);
  });

  it('loads receitas by selected month and updates total', () => {
    component.mesAtual = new Date(2026, 2, 1);
    receitaService.obterPorReferencia.and.returnValue(of([
      { id: 'receita-1', descricao: 'Salario', valor: 5000, data: '2026-03-01', mesReferencia: '2026-03-01' },
      { id: 'receita-2', descricao: 'Bonus', valor: 750, data: '2026-03-15', mesReferencia: '2026-03-01' }
    ]));

    component.carregarReceitas();

    expect(receitaService.obterPorReferencia).toHaveBeenCalledWith(3, 2026);
    expect(component.totalReceitas).toBe(5750);
    expect(component.estadoCarregamento).toBe('loadedWithData');
  });

  it('shows empty-period and load-error states for receitas', () => {
    component.mesAtual = new Date(2026, 4, 1);
    receitaService.obterPorReferencia.and.returnValue(of([]));

    component.carregarReceitas();

    expect(component.estadoCarregamento).toBe('emptyPeriod');
    expect(component.mensagemCarregamento).toContain('Nenhum registro');

    spyOn(console, 'error');
    receitaService.obterPorReferencia.and.returnValue(throwError(() => new Error('falha')));

    component.carregarReceitas();

    expect(component.estadoCarregamento).toBe('loadError');
    expect(component.totalReceitas).toBe(0);
    expect(component.mensagemCarregamento).toContain('Não foi possível');
  });

  it('creates receita once and reloads the returned reference month', () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
    const response: CriarReceitaResponse = {
      id: 'receita-1',
      descricao: 'Salário',
      valor: 5250.75,
      data: '2026-06-05',
      mesReferencia: '2026-05-01'
    };
    receitaService.criarReceita.and.returnValue(of(response));
    component.novaReceita = {
      id: '',
      descricao: ' Salário ',
      valor: 5250.75,
      data: '2026-06-05',
      mesReferencia: '2026-05'
    };

    component.salvarReceita();

    expect(receitaService.criarReceita).toHaveBeenCalledOnceWith({
      descricao: 'Salário',
      valor: 5250.75,
      data: '2026-06-05',
      mesReferencia: '2026-05-01'
    });
    expect(component.mesAtual.getMonth()).toBe(4);
    expect(receitaService.obterPorReferencia).toHaveBeenCalledWith(5, 2026);
    expect(component.salvandoReceita).toBeFalse();
  });

  it('blocks repeated submissions while saving', () => {
    const pending = new Subject<CriarReceitaResponse>();
    receitaService.criarReceita.and.returnValue(pending);
    component.novaReceita = {
      id: '',
      descricao: 'Salário',
      valor: 5000,
      data: '2026-06-05',
      mesReferencia: '2026-05'
    };

    component.salvarReceita();
    component.salvarReceita();

    expect(receitaService.criarReceita).toHaveBeenCalledTimes(1);
    expect(component.salvandoReceita).toBeTrue();
  });

  it('preserves form and shows backend validation message', () => {
    const alert = spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
    receitaService.criarReceita.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 400,
      error: { message: 'Valor deve ser maior que zero.' }
    })));
    component.novaReceita = {
      id: '',
      descricao: 'Salário',
      valor: 5000,
      data: '2026-06-05',
      mesReferencia: '2026-05'
    };

    component.salvarReceita();

    expect(component.novaReceita.descricao).toBe('Salário');
    expect(component.salvandoReceita).toBeFalse();
    expect(alert).toHaveBeenCalledWith(jasmine.objectContaining({
      text: 'Valor deve ser maior que zero.'
    }));
  });

  [
    { status: 401, message: 'Sua sessão expirou. Entre novamente.' },
    { status: 403, message: 'Você não tem permissão para salvar esta receita.' },
    { status: 503, message: 'Serviço temporariamente indisponível. Tente novamente.' }
  ].forEach(({ status, message }) => {
    it(`keeps the form and classifies HTTP ${status}`, () => {
      const alert = spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as any);
      receitaService.criarReceita.and.returnValue(throwError(() => new HttpErrorResponse({ status })));
      component.novaReceita = {
        id: '',
        descricao: 'Salário',
        valor: 5000,
        data: '2026-06-05',
        mesReferencia: '2026-05'
      };

      component.salvarReceita();

      expect(component.novaReceita.data).toBe('2026-06-05');
      expect(component.salvandoReceita).toBeFalse();
      expect(alert).toHaveBeenCalledWith(jasmine.objectContaining({ text: message }));
    });
  });
});
