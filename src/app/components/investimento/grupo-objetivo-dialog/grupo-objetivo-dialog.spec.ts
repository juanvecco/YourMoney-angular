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
    service = jasmine.createSpyObj('InvestimentoGrupoService', ['criar', 'renomear', 'excluir', 'arquivar', 'reativar', 'enviarImagem']);
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

  it('edits target metadata and archives without deleting history', () => {
    service.renomear.and.returnValue(of({} as any));
    service.arquivar.and.returnValue(of({} as any));
    const grupo = { ...component.grupos[0], ativo: true, valorAlvo: 150000, dataAlvo: '2030-01-01' };
    component.editar(grupo); component.nome = 'Carro'; component.salvar();
    expect(service.renomear).toHaveBeenCalledWith('g1', jasmine.objectContaining({ nome: 'Carro', valorAlvo: 150000, dataAlvo: '2030-01-01' }));
    component.alterarEstado(grupo);
    expect(service.arquivar).toHaveBeenCalledWith(grupo);
    expect(service.excluir).not.toHaveBeenCalled();
  });

  it('fills the City LX family goal suggestion with its image and target', () => {
    component.aplicarSugestaoCarro();

    expect(component.nome).toBe('Carro / Família');
    expect(component.descricao).toBe('City LX Sedan');
    expect(component.valorAlvo).toBe(117700);
    expect(component.imagemUrl).toBe('/assets/objectives/city-lx-sedan.jpg');
  });

  it('uploads a supported objective image and keeps the returned internal path', () => {
    service.enviarImagem.and.returnValue(of({ imagemUrl: '/uploads/objetivos/custom.webp' }));
    const arquivo = new File([new Uint8Array([1, 2, 3])], 'carro.webp', { type: 'image/webp' });
    const input = document.createElement('input');
    Object.defineProperty(input, 'files', { value: [arquivo] });

    component.selecionarImagem({ target: input } as unknown as Event);

    expect(service.enviarImagem).toHaveBeenCalledWith(arquivo);
    expect(component.imagemUrl).toBe('/uploads/objetivos/custom.webp');
  });
});
