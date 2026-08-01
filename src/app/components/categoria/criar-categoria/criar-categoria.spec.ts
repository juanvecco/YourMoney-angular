import { TestBed } from '@angular/core/testing';
import { CriarCategoriaComponent } from './criar-categoria';

describe('CriarCategoriaComponent', () => {
  it('exposes an accessible modal name and safe close action', async () => {
    await TestBed.configureTestingModule({ imports: [CriarCategoriaComponent] }).compileComponents();
    const fixture = TestBed.createComponent(CriarCategoriaComponent);
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-labelledby')).toBe('categoriaModalTitulo');
    expect(fixture.nativeElement.querySelector('button[aria-label="Fechar diálogo de categoria"]')).toBeTruthy();
  });
});
