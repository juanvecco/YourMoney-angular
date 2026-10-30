import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { RecuperarSenhaPageComponent } from './recuperar-senha-page';
import { provideRouter } from '@angular/router';

describe('RecuperarSenhaPageComponent', () => {
  let fixture: ComponentFixture<RecuperarSenhaPageComponent>;
  const auth = jasmine.createSpyObj<AuthService>('AuthService', ['requestPasswordReset']);

  beforeEach(async () => {
    auth.requestPasswordReset.and.returnValue(of({ mensagem: 'Se a conta existir, enviaremos as instruções.' }));
    await TestBed.configureTestingModule({
      imports: [RecuperarSenhaPageComponent],
      providers: [{ provide: AuthService, useValue: auth }, provideRouter([])],
    }).compileComponents();
    fixture = TestBed.createComponent(RecuperarSenhaPageComponent);
  });

  it('marks invalid input and shows the neutral server response', () => {
    fixture.componentInstance.enviar();
    expect(fixture.componentInstance.form.controls.email.touched).toBeTrue();
    fixture.componentInstance.form.setValue({ email: 'maria@example.com' });
    fixture.componentInstance.enviar();
    expect(fixture.componentInstance.mensagem).toContain('Se a conta existir');
  });
});
