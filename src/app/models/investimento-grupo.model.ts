export interface GrupoObjetivoInvestimento {
  id: string;
  nome: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  versao: string;
  quantidadeInvestimentos: number;
  valorAlvo?: number | null;
  dataAlvo?: string | null;
  grupoPaiId?: string | null;
  ativo?: boolean;
  arquivadoEm?: string | null;
}

export interface CriarGrupoObjetivoRequest {
  nome: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  valorAlvo?: number | null;
  dataAlvo?: string | null;
  grupoPaiId?: string | null;
}

export interface RenomearGrupoObjetivoRequest {
  nome: string;
  descricao?: string | null;
  imagemUrl?: string | null;
  versao: string;
  valorAlvo?: number | null;
  dataAlvo?: string | null;
  grupoPaiId?: string | null;
}

export interface EnviarImagemObjetivoResponse {
  imagemUrl: string;
}

export interface GrupoObjetivoResumo extends GrupoObjetivoInvestimento {
  valorAtualCarteira: number; percentualAlvoAtingido: number | null;
  valorPlanejadoMes: number; valorConfirmadoMes: number; diferencaMes: number;
  statusPlanejamento: 'AbaixoPlanejado' | 'PlanejadoAtingido' | 'AcimaPlanejado';
  valorAguardandoAlocacao: number;
  investimentos: Array<{ id: string; nome: string; valorAtual: number }>;
}

export type AcaoVinculosGrupoObjetivo = 'ExigirVazio' | 'Desassociar' | 'Transferir';

export interface ExcluirGrupoObjetivoRequest {
  versaoOrigem: string;
  acaoVinculos: AcaoVinculosGrupoObjetivo;
  grupoDestinoId?: string | null;
  versaoDestino?: string | null;
}
