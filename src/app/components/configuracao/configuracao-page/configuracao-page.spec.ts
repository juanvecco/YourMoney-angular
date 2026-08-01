import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { CategoriaService } from '../../../services/categoria';
import { FeedbackService } from '../../../services/feedback.service';
import { ConfiguracaoPageComponent } from './configuracao-page';

describe('ConfiguracaoPageComponent', () => {
  it('renders a single page heading and real category button', async () => {
    await TestBed.configureTestingModule({
      imports: [ConfiguracaoPageComponent],
      providers: [
        { provide: CategoriaService, useValue: { listarCategorias: () => of([]) } },
        { provide: FeedbackService, useValue: { confirm: () => Promise.resolve(false) } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(ConfiguracaoPageComponent);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('h1')).toHaveSize(1);
    expect(fixture.nativeElement.querySelector('button.ym-kpi')).toBeTruthy();
  });
});
