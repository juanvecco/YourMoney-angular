import { TestBed } from '@angular/core/testing';
import Swal from 'sweetalert2';
import { FeedbackService } from './feedback.service';

describe('FeedbackService', () => {
  let service: FeedbackService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [FeedbackService] });
    service = TestBed.inject(FeedbackService);
  });

  it('returns false when a destructive confirmation is cancelled', async () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: false } as never);
    await expectAsync(service.confirm({ kind: 'confirmation', title: 'Excluir despesa?', confirmLabel: 'Excluir', destructive: true })).toBeResolvedTo(false);
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ focusCancel: true, cancelButtonText: 'Cancelar' }));
  });

  it('shows explicit pt-BR success feedback', async () => {
    spyOn(Swal, 'fire').and.resolveTo({ isConfirmed: true } as never);
    await service.success('Receita salva', 'Os dados foram atualizados.');
    expect(Swal.fire).toHaveBeenCalledWith(jasmine.objectContaining({ icon: 'success', title: 'Receita salva' }));
  });
});
