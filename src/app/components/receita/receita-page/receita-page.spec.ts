import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { ReceitaPageComponent } from './receita-page';
import { ReceitaService } from '../../../services/receita';
import { AuthService } from '../../../services/auth.service';

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
});
