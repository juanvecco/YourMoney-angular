import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';

import { DespesaService } from './despesa';

describe('DespesaService', () => {
  let service: DespesaService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [DespesaService]
    });
    service = TestBed.inject(DespesaService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
