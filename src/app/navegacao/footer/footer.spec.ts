import { TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer';

describe('FooterComponent', () => {
  it('renders the product and current year in a footer landmark', async () => {
    await TestBed.configureTestingModule({ imports: [FooterComponent] }).compileComponents();
    const fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('footer')).toBeTruthy();
    expect(fixture.nativeElement.textContent).toContain('YourMoney');
    expect(fixture.nativeElement.textContent).toContain(String(new Date().getFullYear()));
  });
});
