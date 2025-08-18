import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CadastrarDespesa } from './cadastrar-despesa';

describe('CadastrarDespesa', () => {
  let component: CadastrarDespesa;
  let fixture: ComponentFixture<CadastrarDespesa>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CadastrarDespesa]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CadastrarDespesa);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
