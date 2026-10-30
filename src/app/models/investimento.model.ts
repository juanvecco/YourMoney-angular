export interface Investimento {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  codigoAtivo?: string | null;
  isin?: string | null;
  precoUnitarioAtual?: number | null;
  valorAtual: number;
  dataInvestimento: string;
  mesReferencia?: string | null;
  dataResgate: string | null;
  ativo: boolean;
  receitaRecorrenteId?: string | null;
  reservaAssociada?: ReservaAssociadaInvestimento | null;
  grupoObjetivoId?: string | null;
  grupoObjetivo?: GrupoObjetivoResumo | null;
  tipoAtivo?: TipoAtivoCodigo | null;
}

export type TipoAtivoCodigo =
  | 'FundoInvestimento'
  | 'Exterior'
  | 'Criptomoeda'
  | 'RendaFixa'
  | 'Acoes'
  | 'Outros';

export interface OpcaoTipoAtivo {
  codigo: TipoAtivoCodigo;
  nome: string;
}

export const TIPOS_ATIVO: readonly OpcaoTipoAtivo[] = [
  { codigo: 'FundoInvestimento', nome: 'Fundo de investimento' },
  { codigo: 'Exterior', nome: 'Investimento no exterior' },
  { codigo: 'Criptomoeda', nome: 'Criptomoeda' },
  { codigo: 'RendaFixa', nome: 'Renda fixa' },
  { codigo: 'Acoes', nome: 'Ações' },
  { codigo: 'Outros', nome: 'Outros' },
] as const;

export interface GrupoObjetivoResumo {
  id: string;
  nome: string;
}

export interface ReservaAssociadaInvestimento {
  descricao: string;
  contaDescricao: string;
  ativa: boolean;
  elegivelParaNovaAssociacao: boolean;
}

export interface ProgressoMetaReserva {
  meses: number;
  valorMeta: number;
  valorRestante: number;
  percentualAlcancado: number;
}

export interface ReservaSalarial {
  receitaRecorrenteId: string;
  descricao: string;
  contaDescricao: string;
  ativa: boolean;
  elegivelParaNovaAssociacao: boolean;
  valorMensal: number;
  valorAcumulado: number;
  metaSeisMeses: ProgressoMetaReserva;
  metaDozeMeses: ProgressoMetaReserva;
}

export interface CarteiraInvestimentosConsolidada {
  totalInvestido: number;
  totalFiltrado?: number;
  itens: Investimento[];
  reservas: ReservaSalarial[];
  subtotaisPorGrupo?: SubtotalGrupoInvestimento[];
  subtotaisPorTipoAtivo?: SubtotalTipoAtivoInvestimento[];
}

export interface SubtotalGrupoInvestimento {
  grupoObjetivoId: string | null;
  nome: string;
  quantidadeInvestimentos: number;
  valorAtual: number;
  percentual?: number;
}

export interface SubtotalTipoAtivoInvestimento {
  tipoAtivo: TipoAtivoCodigo | null;
  nome: string;
  quantidadeInvestimentos: number;
  valorAtual: number;
}

export interface FiltroOrganizacaoInvestimentos {
  grupoObjetivoId?: string;
  semGrupo?: boolean;
  tipoAtivo?: TipoAtivoCodigo;
  naoClassificado?: boolean;
}

export interface CriarInvestimentoRequest extends InvestimentoWriteRequest {
  operacaoId: string;
}

export interface InvestimentoWriteRequest {
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  codigoAtivo?: string | null;
  isin?: string | null;
  precoUnitarioAtual?: number | null;
  valorAtual: number;
  dataInvestimento: string;
  mesReferencia: string;
  receitaRecorrenteId: string | null;
  grupoObjetivoId?: string | null;
  tipoAtivo?: TipoAtivoCodigo | null;
}

export interface CriarInvestimentoResponse extends Investimento {}

export interface AtualizarInvestimentoRequest extends InvestimentoWriteRequest {
  id: string;
}
