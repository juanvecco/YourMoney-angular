import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../environments/environment';
import { dedupeGetInterceptor } from './dedupe-get.interceptor';

describe('dedupeGetInterceptor', () => {
  let http: HttpClient;
  let requests: HttpTestingController;
  const url = `${environment.apiUrl}/Despesas/por-referencia?mes=11&ano=2026`;

  beforeEach(() => {
    localStorage.removeItem('access_token');
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withInterceptors([dedupeGetInterceptor])), provideHttpClientTesting()]
    });
    http = TestBed.inject(HttpClient);
    requests = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    requests.verify();
    localStorage.removeItem('access_token');
  });

  it('shares an identical in-flight GET and requests fresh data after completion', () => {
    const first = jasmine.createSpy('first');
    const second = jasmine.createSpy('second');
    http.get(url).subscribe(first);
    http.get(url).subscribe(second);

    const call = requests.expectOne(url);
    call.flush({ total: 25 });
    expect(first).toHaveBeenCalledWith({ total: 25 });
    expect(second).toHaveBeenCalledWith({ total: 25 });

    http.get(url).subscribe();
    requests.expectOne(url).flush({ total: 30 });
  });

  it('does not share a GET across users or across a mutation', () => {
    localStorage.setItem('access_token', 'user-a');
    http.get(url).subscribe();
    localStorage.setItem('access_token', 'user-b');
    http.get(url).subscribe();
    const userCalls = requests.match(url);
    expect(userCalls.length).toBe(2);
    userCalls.forEach(call => call.flush({}));

    http.get(url).subscribe();
    http.post(`${environment.apiUrl}/Despesas`, { valor: 10 }).subscribe();
    http.get(url).subscribe();
    const beforeAndAfterWrite = requests.match(url);
    expect(beforeAndAfterWrite.length).toBe(2);
    beforeAndAfterWrite.forEach(call => call.flush({}));
    requests.expectOne(`${environment.apiUrl}/Despesas`).flush({});
  });

  it('retries the network after a failed GET', () => {
    http.get(url).subscribe({ error: () => {} });
    http.get(url).subscribe({ error: () => {} });
    const failed = requests.match(url);
    expect(failed.length).toBe(1);
    failed[0].flush({}, { status: 500, statusText: 'Error' });
    http.get(url).subscribe();
    requests.expectOne(url).flush({});
  });
});
