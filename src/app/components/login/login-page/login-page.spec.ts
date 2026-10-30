import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { LoginPageComponent } from './login-page';

describe('LoginPageComponent', () => {
  it('associates accessible labels with login controls', async () => {
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { login: jasmine.createSpy('login') } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('label[for="loginEmail"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('label[for="loginSenha"]')).toBeTruthy();
  });
});
