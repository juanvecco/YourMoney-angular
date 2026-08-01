export interface Investimento {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  valorAtual: number;
  dataInvestimento: string;
  mesReferencia?: string | null;
  dataResgate: string | null;
  ativo: boolean;
  receitaRecorrenteId?: string | null;
  reservaAssociada?: ReservaAssociadaInvestimento | null;
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
  itens: Investimento[];
  reservas: ReservaSalarial[];
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
  valorAtual: number;
  dataInvestimento: string;
  mesReferencia: string;
  receitaRecorrenteId: string | null;
}

export interface CriarInvestimentoResponse extends Investimento {}

export interface AtualizarInvestimentoRequest extends InvestimentoWriteRequest {
  id: string;
}
