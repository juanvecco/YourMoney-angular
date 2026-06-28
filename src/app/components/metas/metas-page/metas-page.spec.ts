import { of, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { MetasPageComponent } from './metas-page';
import { MetaMensalService } from '../../../services/meta-mensal';
import { MetasMensaisResumo } from '../../../models/meta-mensal.model';
import { AuthService } from '../../../services/auth.service';

describe('MetasPageComponent', () => {
  let component: MetasPageComponent;
  let service: jasmine.SpyObj<MetaMensalService>;
  let authService: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  const resumo: MetasMensaisResumo = {
    mesReferencia: '2026-06-01',
    receitaTotal: 10000,
    despesaTotal: 2500,
    percentualTotalComprometido: 35,
    valorTotalReservado: 3500,
    percentualRestante: 65,
    valorRestanteAntesDespesas: 6500,
    saldoFinal: 4000,
    valorFaltante: 0,
    status: 'disponivel',
    alertas: [],
    metas: [
      {
        id: 'meta-1',
        nome: 'Investimento',
        percentualReceita: 25,
        valorCalculado: 2500,
        mesReferencia: '2026-06-01'
      }
    ]
  };

  beforeEach(() => {
    service = jasmine.createSpyObj<MetaMensalService>('MetaMensalService', [
      'obterResumo',
      'criarMeta',
      'atualizarMeta',
      'deletarMeta'
    ]);
    service.obterResumo.and.returnValue(of(resumo));
    service.criarMeta.and.returnValue(of(resumo.metas[0]));
    service.atualizarMeta.and.returnValue(of(resumo.metas[0]));
    service.deletarMeta.and.returnValue(of(void 0));
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['logout']);
    router = jasmine.createSpyObj<Router>('Router', ['navigate']);
    spyOn(window, 'confirm').and.returnValue(true);

    component = new MetasPageComponent(service, authService, router);
    component.mesAtual = new Date(2026, 5, 1);
  });

  it('loads summary and exposes calculated values', () => {
    component.carregarResumo();

    expect(service.obterResumo).toHaveBeenCalledWith(6, 2026);
    expect(component.estado).toBe('loaded');
    expect(component.resumo?.valorTotalReservado).toBe(3500);
    expect(component.metas[0].valorCalculado).toBe(2500);
    expect(component.formatarMoeda(2500)).toContain('2.500,00');
  });

  it('handles empty and error states', () => {
    service.obterResumo.and.returnValue(of({ ...resumo, metas: [] }));
    component.carregarResumo();
    expect(component.estado).toBe('empty');

    service.obterResumo.and.returnValue(throwError(() => new Error('falha')));
    component.carregarResumo();
    expect(component.estado).toBe('error');
    expect(component.mensagemErro).toContain('Não foi possível');
  });

  it('creates, edits, and deletes goals refreshing the summary', () => {
    component.formulario = { id: '', nome: ' Investimento ', percentualReceita: 25 };
    component.salvarMeta();

    expect(service.criarMeta).toHaveBeenCalledWith({
      nome: 'Investimento',
      percentualReceita: 25,
      mesReferencia: '2026-06-01'
    });

    component.editarMeta(resumo.metas[0]);
    component.formulario.percentualReceita = 30;
    component.salvarMeta();

    expect(service.atualizarMeta).toHaveBeenCalledWith({
      id: 'meta-1',
      nome: 'Investimento',
      percentualReceita: 30
    });

    component.excluirMeta(resumo.metas[0]);

    expect(service.deletarMeta).toHaveBeenCalledWith('meta-1');
  });

  it('blocks invalid form and shows alert status labels', () => {
    component.formulario = { id: '', nome: '', percentualReceita: 0 };

    expect(component.formularioValido()).toBeFalse();
    expect(component.obterStatusTexto('faltando')).toBe('Está faltando dinheiro');

    component.resumo = {
      ...resumo,
      status: 'faltando',
      valorFaltante: 1000,
      alertas: ['As metas ultrapassam 100% da receita do mês.']
    };

    expect(component.temAlertas).toBeTrue();
  });

  it('logs out using the existing authenticated flow', () => {
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
