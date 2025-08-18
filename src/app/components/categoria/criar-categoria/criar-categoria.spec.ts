import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CriarCategoriaComponent } from './criar-categoria';

describe('CriarCategoria', () => {
  let component: CriarCategoriaComponent;
  let fixture: ComponentFixture<CriarCategoriaComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CriarCategoriaComponent]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CriarCategoriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
