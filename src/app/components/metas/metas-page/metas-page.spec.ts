import { of, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter, Router } from '@angular/router';
import { TestBed } from '@angular/core/testing';
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
    receitaTotalBruta: 11000,
    receitaElegivelMetas: 10000,
    receitaExcluidaMetas: 1000,
    despesaTotal: 2500,
    despesaTotalBruta: 2700,
    despesaTotalReembolsada: 200,
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
        tipoDefinicao: 'Percentual',
        percentualReceita: 25,
        valorMeta: null,
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
    expect(component.resumo?.receitaElegivelMetas).toBe(10000);
    expect(component.resumo?.receitaExcluidaMetas).toBe(1000);
    expect(component.resumo?.despesaTotalReembolsada).toBe(200);
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

  it('creates percentage and value goals with discriminated payloads', () => {
    component.resumo = resumo;
    component.formulario = {
      id: '',
      nome: ' Investimento ',
      tipoDefinicao: 'Percentual',
      percentualReceita: 25,
      valorMeta: null
    };
    component.salvarMeta();

    expect(service.criarMeta).toHaveBeenCalledWith({
      nome: 'Investimento',
      tipoDefinicao: 'Percentual',
      percentualReceita: 25,
      valorMeta: null,
      mesReferencia: '2026-06-01'
    });

    component.resumo = resumo;
    component.formulario = {
      id: '',
      nome: ' Reserva ',
      tipoDefinicao: 'Valor',
      percentualReceita: null,
      valorMeta: 1000
    };
    component.salvarMeta();

    expect(service.criarMeta).toHaveBeenCalledWith({
      nome: 'Reserva',
      tipoDefinicao: 'Valor',
      percentualReceita: null,
      valorMeta: 1000,
      mesReferencia: '2026-06-01'
    });
  });

  it('loads the principal field, edits, changes mode, and deletes', () => {
    component.resumo = resumo;
    component.editarMeta(resumo.metas[0]);
    expect(component.formulario.tipoDefinicao).toBe('Percentual');
    component.formulario.percentualReceita = 30;
    component.salvarMeta();

    expect(service.atualizarMeta).toHaveBeenCalledWith({
      id: 'meta-1',
      nome: 'Investimento',
      tipoDefinicao: 'Percentual',
      percentualReceita: 30,
      valorMeta: null
    });

    component.editarMeta(resumo.metas[0]);
    component.alterarTipoDefinicao('Valor');
    expect(component.formulario.percentualReceita).toBeNull();
    expect(component.formulario.valorMeta).toBeNull();
    component.formulario.valorMeta = 1500;
    component.salvarMeta();

    expect(service.atualizarMeta).toHaveBeenCalledWith({
      id: 'meta-1',
      nome: 'Investimento',
      tipoDefinicao: 'Valor',
      percentualReceita: null,
      valorMeta: 1500
    });

    component.excluirMeta(resumo.metas[0]);

    expect(service.deletarMeta).toHaveBeenCalledWith('meta-1');
  });

  it('blocks invalid form and shows alert status labels', () => {
    expect(component.formulario.tipoDefinicao).toBe('Percentual');
    component.formulario = {
      id: '',
      nome: '',
      tipoDefinicao: 'Percentual',
      percentualReceita: 0,
      valorMeta: null
    };

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

  it('cancels editing and restores the default percentage form', () => {
    component.editarMeta(resumo.metas[0]);
    component.formulario.percentualReceita = 30;

    component.cancelarEdicao();

    expect(component.editando).toBeFalse();
    expect(component.formulario.id).toBe('');
    expect(component.formulario.nome).toBe('');
    expect(component.formulario.tipoDefinicao).toBe('Percentual');
    expect(component.formulario.percentualReceita).toBeNull();
  });

  it('blocks value mode without revenue and displays unavailable percentages safely', () => {
    component.resumo = {
      ...resumo,
      receitaTotal: 0,
      receitaElegivelMetas: 0,
      percentualTotalComprometido: null,
      percentualRestante: null
    };
    component.formulario = {
      id: '',
      nome: 'Reserva',
      tipoDefinicao: 'Valor',
      percentualReceita: null,
      valorMeta: 1000
    };

    expect(component.formularioValido()).toBeFalse();
    expect(component.formatarPercentual(null)).toBe('Indisponível');
    expect(component.formatarPercentual(Number.NaN)).toBe('Indisponível');
  });

  it('preserves the form and shows the backend validation message', () => {
    service.criarMeta.and.returnValue(throwError(() => new HttpErrorResponse({
      status: 409,
      error: { message: 'Não há receita elegível positiva.' }
    })));
    component.resumo = resumo;
    component.formulario = {
      id: '',
      nome: 'Reserva',
      tipoDefinicao: 'Valor',
      percentualReceita: null,
      valorMeta: 1000
    };

    component.salvarMeta();

    expect(component.mensagemErro).toBe('Não há receita elegível positiva.');
    expect(component.formulario.nome).toBe('Reserva');
    expect(component.formulario.valorMeta).toBe(1000);
    expect(component.salvando).toBeFalse();
  });

  it('renders eligible, excluded, gross and reimbursed summary labels', async () => {
    await TestBed.configureTestingModule({
      imports: [MetasPageComponent],
      providers: [
        provideRouter([]),
        { provide: MetaMensalService, useValue: service },
        { provide: AuthService, useValue: authService }
      ]
    }).compileComponents();

    const fixture = TestBed.createComponent(MetasPageComponent);
    fixture.componentInstance.mesAtual = new Date(2026, 5, 1);
    fixture.detectChanges();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Receita elegível para metas');
    expect(text).toContain('fora das metas');
    expect(text).toContain('Bruta');
    expect(text).toContain('reembolsada');
    expect(text).toContain('Definir meta por');
    expect(text).toContain('Definida por percentual');
  });

  it('logs out using the existing authenticated flow', () => {
    component.logout();

    expect(authService.logout).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });
});
