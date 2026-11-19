import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AdminUsuariosService } from '../../services/admin-usuarios.service';
import { AuthService } from '../../services/auth.service';
import { UsuariosAdminPageComponent } from './usuarios-admin-page';

describe('UsuariosAdminPageComponent', () => {
  let fixture: ComponentFixture<UsuariosAdminPageComponent>;
  const users = jasmine.createSpyObj<AdminUsuariosService>('AdminUsuariosService', ['listar']);
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['requestPasswordReset', 'createInvite', 'listInvites', 'revokeInvite']);

  beforeEach(async () => {
    users.listar.and.returnValue(of({
      itens: [{ id: '1', nome: 'Maria', email: 'maria@example.com' }],
      pagina: 1, tamanho: 25, total: 1, redefinicaoDisponivel: true,
    }));
    auth.requestPasswordReset.and.returnValue(of({ mensagem: 'Solicitação aceita.' }));
    auth.createInvite.and.returnValue(of({ codigo: 'code', link: 'https://example.com/cadastro?convite=code', expiraEm: '2026-11-26T00:00:00Z' }));
    auth.listInvites.and.returnValue(of([]));
    await TestBed.configureTestingModule({
      imports: [UsuariosAdminPageComponent],
      providers: [
        { provide: AdminUsuariosService, useValue: users },
        { provide: AuthService, useValue: auth },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(UsuariosAdminPageComponent);
    fixture.detectChanges();
  });

  it('shows the account and requests a reset without exposing credentials', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('Maria');
    expect(page.textContent).toContain('maria@example.com');
    expect(page.textContent).toContain('1 conta');
    expect(page.querySelector('input[type="password"]')).toBeNull();
    page.querySelector<HTMLButtonElement>('[aria-label="Enviar redefinição de senha para maria@example.com"]')?.click();
    fixture.detectChanges();
    expect(auth.requestPasswordReset).toHaveBeenCalledOnceWith({ email: 'maria@example.com' });
    expect(page.textContent).toContain('Solicitação de redefinição registrada');
  });

  it('does not offer email delivery when SMTP is unavailable', () => {
    users.listar.and.returnValue(of({
      itens: [{ id: '1', nome: 'Maria', email: 'maria@example.com' }],
      pagina: 1, tamanho: 25, total: 1, redefinicaoDisponivel: false,
    }));
    fixture.componentInstance.carregar();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).toContain('ainda não está configurado');
    expect(page.querySelector('[aria-label="Enviar redefinição de senha para maria@example.com"]')).toBeNull();
  });

  it('shows a one-time invitation link only when an admin requests one', () => {
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('#admin-invite-link')).toBeNull();
    page.querySelector<HTMLButtonElement>('.admin-invites__actions button')?.click();
    fixture.detectChanges();
    expect(auth.createInvite).toHaveBeenCalled();
    expect(page.querySelector<HTMLInputElement>('#admin-invite-link')?.value).toContain('convite=code');
  });
});
