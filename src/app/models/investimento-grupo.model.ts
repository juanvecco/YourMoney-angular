export interface GrupoObjetivoInvestimento {
  id: string;
  nome: string;
  versao: string;
  quantidadeInvestimentos: number;
}

export interface CriarGrupoObjetivoRequest {
  nome: string;
}

export interface RenomearGrupoObjetivoRequest {
  nome: string;
  versao: string;
}

export type AcaoVinculosGrupoObjetivo = 'ExigirVazio' | 'Desassociar' | 'Transferir';

export interface ExcluirGrupoObjetivoRequest {
  versaoOrigem: string;
  acaoVinculos: AcaoVinculosGrupoObjetivo;
  grupoDestinoId?: string | null;
  versaoDestino?: string | null;
}
