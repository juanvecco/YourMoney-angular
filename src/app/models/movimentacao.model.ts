export type TipoMovimentacao = 'receita' | 'despesa' | 'investimento';

export interface MovimentacaoFinanceira {
  id: string;
  tipo: TipoMovimentacao;
  descricao: string;
  data: string;
  mesReferencia: string;
  valor: number;
  contaFinanceiraId?: string | null;
  contaFinanceiraNome?: string | null;
  categoria?: string | null;
  rotaOrigem: '/receitas' | '/despesas' | '/investimento';
}

export interface ResumoFinanceiroPeriodo {
  receitas: number;
  despesas: number;
  investimentos: number;
  saldo: number;
}

export interface ResumoFinanceiroMensal extends ResumoFinanceiroPeriodo {
  mesReferencia: string;
  totalItens: number;
}

export interface ConsultaMovimentacoes {
  mesInicial: string;
  mesFinal: string;
  tipo?: TipoMovimentacao | '';
  contaFinanceiraId?: string;
  busca?: string;
  pagina?: number;
  tamanhoPagina?: number;
}

export interface ConsultaMovimentacoesResponse {
  itens: MovimentacaoFinanceira[];
  pagina: number;
  tamanhoPagina: number;
  totalItens: number;
  totalPaginas: number;
  totais: ResumoFinanceiroPeriodo;
  totaisPorMes?: ResumoFinanceiroMensal[];
}
