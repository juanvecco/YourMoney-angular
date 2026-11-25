import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  CriarGrupoObjetivoRequest,
  EnviarImagemObjetivoResponse,
  ExcluirGrupoObjetivoRequest,
  GrupoObjetivoInvestimento,
  GrupoObjetivoResumo,
  RenomearGrupoObjetivoRequest,
} from '../models/investimento-grupo.model';

@Injectable({ providedIn: 'root' })
export class InvestimentoGrupoService {
  private readonly baseUrl = `${environment.apiUrl}/InvestimentoGrupos`;

  constructor(private readonly http: HttpClient) {}

  listar(incluirArquivados = false): Observable<GrupoObjetivoInvestimento[]> {
    return incluirArquivados
      ? this.http.get<GrupoObjetivoInvestimento[]>(this.baseUrl, { params: { incluirArquivados: true } })
      : this.http.get<GrupoObjetivoInvestimento[]>(this.baseUrl);
  }

  resumo(mes: number, ano: number, incluirArquivados = false): Observable<GrupoObjetivoResumo[]> {
    return this.http.get<GrupoObjetivoResumo[]>(`${this.baseUrl}/resumo`, { params: { mes, ano, incluirArquivados } });
  }

  arquivar(grupo: GrupoObjetivoInvestimento): Observable<GrupoObjetivoInvestimento> {
    return this.http.post<GrupoObjetivoInvestimento>(`${this.baseUrl}/${grupo.id}/arquivamento`, { versao: grupo.versao });
  }

  reativar(grupo: GrupoObjetivoInvestimento): Observable<GrupoObjetivoInvestimento> {
    return this.http.post<GrupoObjetivoInvestimento>(`${this.baseUrl}/${grupo.id}/reativacao`, { versao: grupo.versao });
  }

  obter(id: string): Observable<GrupoObjetivoInvestimento> {
    return this.http.get<GrupoObjetivoInvestimento>(`${this.baseUrl}/${id}`);
  }

  criar(request: CriarGrupoObjetivoRequest): Observable<GrupoObjetivoInvestimento> {
    return this.http.post<GrupoObjetivoInvestimento>(this.baseUrl, request);
  }

  enviarImagem(imagem: File): Observable<EnviarImagemObjetivoResponse> {
    const dados = new FormData();
    dados.append('imagem', imagem, imagem.name);
    return this.http.post<EnviarImagemObjetivoResponse>(`${this.baseUrl}/imagens`, dados);
  }

  obterStatusUploadImagem(): Observable<{ uploadHabilitado: boolean }> {
    return this.http.get<{ uploadHabilitado: boolean }>(`${this.baseUrl}/imagens/status`);
  }

  carregarImagem(imagemUrl: string): Observable<Blob> {
    const nomeArquivo = this.nomeArquivoImagem(imagemUrl);
    return this.http.get(`${this.baseUrl}/imagens/${encodeURIComponent(nomeArquivo)}`, { responseType: 'blob' });
  }

  excluirImagemTemporaria(imagemUrl: string): Observable<void> {
    const nomeArquivo = this.nomeArquivoImagem(imagemUrl);
    return this.http.delete<void>(`${this.baseUrl}/imagens/${encodeURIComponent(nomeArquivo)}`);
  }

  renomear(id: string, request: RenomearGrupoObjetivoRequest): Observable<GrupoObjetivoInvestimento> {
    return this.http.put<GrupoObjetivoInvestimento>(`${this.baseUrl}/${id}`, request);
  }

  excluir(id: string, request: ExcluirGrupoObjetivoRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/exclusao`, request);
  }

  private nomeArquivoImagem(imagemUrl: string): string {
    const match = /^\/uploads\/objetivos\/([0-9a-f]{32}\.(?:png|jpg|webp))$/i.exec(imagemUrl);
    if (!match) throw new Error('URL de imagem de objetivo inválida.');
    return match[1];
  }
}
