import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CadastroPageComponent } from './cadastro-page';
import { AuthService } from '../../../services/auth.service';

describe('CadastroPageComponent', () => {
  let fixture: ComponentFixture<CadastroPageComponent>;
  let component: CadastroPageComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let navigate: jasmine.Spy;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['register', 'getExternalMethods', 'validateInvite', 'completeExternalLogin']);
    auth.getExternalMethods.and.returnValue(of({ google: false, apple: false }));
    await TestBed.configureTestingModule({
      imports: [CadastroPageComponent],
      providers: [{ provide: AuthService, useValue: auth }, provideRouter([])]
    }).compileComponents();
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(CadastroPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('reveals one question at a time and preserves answers when going back', () => {
    const page: HTMLElement = fixture.nativeElement;
    expect(page.textContent).toContain('Como podemos te chamar?');
    expect(page.textContent).not.toContain('Criar senha');
    component.form.controls['nome'].setValue('Maria');
    component.continueFromName();
    fixture.detectChanges();
    expect(page.textContent).toContain('Prazer em te conhecer, Maria!');
    component.next();
    component.selectGoal('cartao');
    component.selectGoal('gastos');
    component.next();
    component.selectSource('instagram');
    component.back();
    expect(component.selectedGoals).toEqual(['cartao', 'gastos']);
    expect(component.form.controls['objetivoInicial'].value).toBe('cartao');
    component.next();
    expect(component.origemConhecimento).toBe('instagram');
  });

  it('keeps social choices unavailable until configured and creates an email account', () => {
    const page: HTMLElement = fixture.nativeElement;
    component.form.controls['nome'].setValue('Maria Silva');
    component.continueFromName();
    component.next();
    component.selectGoal('gastos');
    component.selectGoal('cartao');
    component.next();
    component.selectSource('google');
    component.next();
    fixture.detectChanges();
    expect(page.querySelector<HTMLButtonElement>('[data-provider="google"]')?.disabled).toBeTrue();
    auth.register.and.returnValue(of({
      accessToken: 'token', expiresIn: 900,
      usuarioToken: { id: 'user-id', nome: 'Maria Silva', email: 'maria@example.com', claims: [] }
    }));
    component.chooseEmail();
    component.form.patchValue({ email: 'maria@example.com', senha: 'Senha123', senhaConfirmacao: 'Senha123' });
    component.onSubmit();
    expect(auth.register).toHaveBeenCalledWith(jasmine.objectContaining({
      nome: 'Maria Silva', objetivoInicial: 'gastos', objetivosIniciais: ['gastos', 'cartao'], origemConhecimento: 'google', email: 'maria@example.com'
    }));
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('blocks invalid email data and preserves the journey after a server error', () => {
    component.onSubmit();
    expect(auth.register).not.toHaveBeenCalled();
    component.form.controls['nome'].setValue('Maria');
    component.continueFromName();
    component.next();
    component.selectGoal('saldo');
    component.next();
    component.selectSource('prefiro-nao-responder');
    component.next();
    component.chooseEmail();
    component.form.patchValue({ email: 'maria@example.com', senha: 'Senha123', senhaConfirmacao: 'Senha123' });
    auth.register.and.returnValue(throwError(() => ({ error: { errors: { Mensagens: ['E-mail já está em uso.'] } } })));
    component.onSubmit();
    expect(component.error).toContain('E-mail já está em uso');
    expect(component.form.controls['objetivoInicial'].value).toBe('saldo');
    expect(component.step).toBe('email');
  });

  it('offers existing-account and recovery paths when registration email is already used', () => {
    component.form.controls['nome'].setValue('Maria');
    component.continueFromName();
    component.next();
    component.selectGoal('saldo');
    component.next();
    component.selectSource('prefiro-nao-responder');
    component.next();
    component.chooseEmail();
    component.form.patchValue({ email: 'maria@example.com', senha: 'Senha123', senhaConfirmacao: 'Senha123' });
    auth.register.and.returnValue(throwError(() => ({ error: { errors: { Mensagens: [
      'Este e-mail já tem uma conta. Entre com e-mail e senha; se esqueceu sua senha, recupere o acesso.'
    ] } } })));
    component.onSubmit();
    fixture.detectChanges();
    expect(component.accountAlreadyExists).toBeTrue();
    expect(fixture.nativeElement.querySelector('a[routerlink="/login"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('a[routerlink="/recuperar-senha"]')).toBeTruthy();
  });

  it('shows Google as available without saying it is coming soon', () => {
    component.methods = { google: true, apple: false };
    component.form.controls['nome'].setValue('Maria');
    component.continueFromName();
    component.next();
    component.selectGoal('gastos');
    component.next();
    component.selectSource('google');
    component.next();
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector<HTMLButtonElement>('[data-provider="google"]')?.disabled).toBeFalse();
    expect(page.textContent).toContain('O acesso com Apple ainda não está disponível');
    expect(page.textContent).not.toContain('Apple e Google estarão disponíveis');
  });

  it('allows toggling goals and requires at least one selection', () => {
    component.form.controls['nome'].setValue('Maria');
    component.continueFromName();
    component.next();
    component.next();
    expect(component.step).toBe('goal');
    expect(component.error).toContain('pelo menos uma');
    component.selectGoal('cartao');
    component.selectGoal('saldo');
    component.selectGoal('cartao');
    expect(component.selectedGoals).toEqual(['saldo']);
    expect(component.form.controls['objetivoInicial'].value).toBe('saldo');
    component.selectGoal('saldo');
    expect(component.selectedGoals).toEqual([]);
    expect(component.form.controls['objetivoInicial'].invalid).toBeTrue();
  });
});
