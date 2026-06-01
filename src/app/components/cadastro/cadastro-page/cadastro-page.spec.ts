import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { provideRouter, Router } from '@angular/router';
import { CadastroPageComponent } from './cadastro-page';
import { AuthService } from '../../../services/auth.service';

describe('CadastroPageComponent', () => {
  let fixture: ComponentFixture<CadastroPageComponent>;
  let component: CadastroPageComponent;
  let authService: jasmine.SpyObj<AuthService>;
  let router: Router;
  let navigateSpy: jasmine.Spy;

  beforeEach(async () => {
    authService = jasmine.createSpyObj<AuthService>('AuthService', ['register']);

    await TestBed.configureTestingModule({
      imports: [CadastroPageComponent],
      providers: [
        { provide: AuthService, useValue: authService },
        provideRouter([])
      ]
    }).compileComponents();

    router = TestBed.inject(Router);
    navigateSpy = spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(CadastroPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('does not submit invalid registration data', () => {
    component.onSubmit();

    expect(authService.register).not.toHaveBeenCalled();
    expect(component.form.touched).toBeTrue();
  });

  it('registers valid data and navigates to dashboard', () => {
    authService.register.and.returnValue(of({
      accessToken: 'token',
      expiresIn: 900,
      usuarioToken: {
        id: 'user-id',
        nome: 'Maria Silva',
        email: 'maria@example.com',
        claims: []
      }
    }));
    component.form.setValue({
      nome: 'Maria Silva',
      email: 'maria@example.com',
      senha: 'Senha123',
      senhaConfirmacao: 'Senha123'
    });

    component.onSubmit();

    expect(authService.register).toHaveBeenCalledWith(component.form.getRawValue());
    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
    expect(component.loading).toBeFalse();
  });

  it('shows API error messages when registration fails', () => {
    authService.register.and.returnValue(throwError(() => ({
      error: { errors: { Mensagens: ['E-mail ja esta em uso.'] } }
    })));
    component.form.setValue({
      nome: 'Maria Silva',
      email: 'maria@example.com',
      senha: 'Senha123',
      senhaConfirmacao: 'Senha123'
    });

    component.onSubmit();

    expect(component.error).toBe('E-mail ja esta em uso.');
    expect(component.loading).toBeFalse();
  });
});
