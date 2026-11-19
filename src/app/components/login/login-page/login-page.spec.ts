import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../../services/auth.service';
import { of } from 'rxjs';
import { LoginPageComponent } from './login-page';

describe('LoginPageComponent', () => {
  it('associates accessible labels with login controls', async () => {
    const externalLogin = jasmine.createSpy('startExistingExternalLogin');
    await TestBed.configureTestingModule({
      imports: [LoginPageComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: {
        login: jasmine.createSpy('login'), getExternalMethods: () => of({ google: false, apple: false }),
        startExistingExternalLogin: externalLogin
      } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(LoginPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('label[for="loginEmail"]')).toBeTruthy();
    expect(fixture.nativeElement.querySelector('label[for="loginSenha"]')).toBeTruthy();
    fixture.componentInstance.methods = { google: true, apple: false };
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.external-login-button').click();
    expect(externalLogin).toHaveBeenCalledOnceWith('google');
  });
});
