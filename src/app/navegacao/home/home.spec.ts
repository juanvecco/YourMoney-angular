import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { HomeComponent } from './home';

describe('HomeComponent', () => {
  it('renders one page heading inside the shared shell content', async () => {
    await TestBed.configureTestingModule({
      imports: [HomeComponent],
      providers: [
        { provide: AuthService, useValue: { isLoggedIn: () => false } },
        provideRouter([]),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(HomeComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveSize(1);
    expect(fixture.nativeElement.textContent).toContain('Registre ganhos e gastos');
    expect(fixture.nativeElement.querySelector('a[href="/cadastro"]')).not.toBeNull();
  });
});
