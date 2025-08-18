import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ListaDespesasComponent } from './lista-despesas';

describe('ListaDespesasComponent', () => {
  let component: ListaDespesasComponent;
  let fixture: ComponentFixture<ListaDespesasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ListaDespesasComponent] // se for standalone
    })
      .compileComponents();

    fixture = TestBed.createComponent(ListaDespesasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
