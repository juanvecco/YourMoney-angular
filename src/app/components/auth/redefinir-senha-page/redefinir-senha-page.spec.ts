import { TestBed } from '@angular/core/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { RedefinirSenhaPageComponent } from './redefinir-senha-page';

describe('RedefinirSenhaPageComponent', () => {
  it('loads the encoded-link fields and validates matching passwords', async () => {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['resetPassword']);
    auth.resetPassword.and.returnValue(of({ mensagem: 'Senha redefinida.' }));
    const query = new Map([['email', 'maria@example.com'], ['token', 'token-temporario']]);
    await TestBed.configureTestingModule({
      imports: [RedefinirSenhaPageComponent],
      providers: [
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: { get: (key: string) => query.get(key) ?? null } } } },
      ],
    }).compileComponents();
    const component = TestBed.createComponent(RedefinirSenhaPageComponent).componentInstance;
    component.ngOnInit();
    component.form.patchValue({ senha: 'NovaSenha123', senhaConfirmacao: 'diferente' });
    expect(component.form.hasError('passwordsMismatch')).toBeTrue();
    component.form.patchValue({ senhaConfirmacao: 'NovaSenha123' });
    component.redefinir();
    expect(auth.resetPassword).toHaveBeenCalled();
    expect(component.concluido).toBeTrue();
  });
});
