import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { FeedbackService } from '../../../services/feedback.service';
import { InvestimentoGrupoService } from '../../../services/investimento-grupo';
import { GrupoObjetivoDialogComponent } from './grupo-objetivo-dialog';

describe('GrupoObjetivoDialogComponent', () => {
  let fixture: ComponentFixture<GrupoObjetivoDialogComponent>;
  let component: GrupoObjetivoDialogComponent;
  let service: jasmine.SpyObj<InvestimentoGrupoService>;
  let feedback: jasmine.SpyObj<FeedbackService>;

  beforeEach(async () => {
    service = jasmine.createSpyObj('InvestimentoGrupoService', ['criar', 'renomear', 'excluir']);
    feedback = jasmine.createSpyObj('FeedbackService', ['success', 'error', 'confirm']);
    feedback.success.and.resolveTo(); feedback.error.and.resolveTo(); feedback.confirm.and.resolveTo(true);
    await TestBed.configureTestingModule({ imports: [GrupoObjetivoDialogComponent], providers: [
      { provide: InvestimentoGrupoService, useValue: service }, { provide: FeedbackService, useValue: feedback }
    ] }).compileComponents();
    fixture = TestBed.createComponent(GrupoObjetivoDialogComponent);
    component = fixture.componentInstance;
    component.grupos = [
      { id: 'g1', nome: 'Reserva', versao: 'AQ==', quantidadeInvestimentos: 2 },
      { id: 'g2', nome: 'Renda', versao: 'Ag==', quantidadeInvestimentos: 0 }
    ];
    fixture.detectChanges();
  });

  it('has associated accessible group form and blocks duplicate submit', () => {
    expect(fixture.nativeElement.querySelector('label[for="nomeObjetivo"]')).not.toBeNull();
    const pending = new Subject<any>(); service.criar.and.returnValue(pending);
    component.nome = 'Reserva futura'; component.salvar(); component.salvar();
    expect(service.criar).toHaveBeenCalledTimes(1);
    pending.next({}); pending.complete();
  });

  it('uses fieldset choices and current versions for transfer', () => {
    service.excluir.and.returnValue(of(void 0));
    void component.prepararExclusao(component.grupos[0]); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset legend').textContent).toContain('O que fazer');
    component.acaoExclusao = 'Transferir'; component.grupoDestinoId = 'g2'; component.confirmarExclusao();
    expect(service.excluir).toHaveBeenCalledWith('g1', jasmine.objectContaining({ versaoOrigem: 'AQ==', grupoDestinoId: 'g2', versaoDestino: 'Ag==' }));
  });

  it('offers unlink when the used group is the only one and supports cancellation', () => {
    component.grupos = [component.grupos[0]];
    void component.prepararExclusao(component.grupos[0]);
    expect(component.acaoExclusao).toBe('Desassociar');
    component.cancelarEdicao();
    expect(component.excluindo).toBeNull();
    expect(service.excluir).not.toHaveBeenCalled();
  });
});
