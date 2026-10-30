import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app';
import { AuthService } from './services/auth.service';

describe('AppComponent shell', () => {
  it('renders one shared menu, main target and footer on public routes', async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: { isLoggedIn: () => false, logout: () => undefined } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-menu')).toHaveSize(1);
    expect(fixture.nativeElement.querySelector('#main-content')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('app-footer')).toHaveSize(1);
  });
});
