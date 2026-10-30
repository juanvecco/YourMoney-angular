import { of } from 'rxjs';
import { ConfirmarAporteDialogComponent } from './confirmar-aporte-dialog';

describe('ConfirmarAporteDialogComponent', () => {
  it('filters allocation destinations by active objective and confirms without changing investment value', () => {
    const service = { disponivel: true, confirmar: jasmine.createSpy().and.returnValue(of({})) } as any;
    const component = new ConfirmarAporteDialogComponent(service);
    component.investimentos = [
      { id: 'i1', nome: 'Tesouro', ativo: true, grupoObjetivoId: 'g1', valorAtual: 3629.2 },
      { id: 'i2', nome: 'Outro', ativo: true, grupoObjetivoId: 'g2', valorAtual: 900 }
    ] as any;
    component.abrir({ id: 'm1', nome: 'Aluguel', tipoDefinicao: 'Valor', percentualReceita: 20,
      valorMeta: 1000, valorCalculado: 1000, mesReferencia: '2026-10-01', grupoObjetivoInvestimentoId: 'g1' });
    expect(component.destinos.map(i => i.id)).toEqual(['i1']);
    component.investimentoId = 'i1'; component.salvar();
    expect(service.confirmar).toHaveBeenCalledWith('m1', jasmine.objectContaining({ valor: 1000, investimentoId: 'i1' }));
    expect(component.investimentos[0].valorAtual).toBe(3629.2);
  });
});
