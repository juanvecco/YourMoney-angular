export type MetaMensalStatus = 'disponivel' | 'zerado' | 'faltando';

export interface MetaMensal {
  id: string;
  nome: string;
  percentualReceita: number;
  valorCalculado: number;
  mesReferencia: string;
}

export interface MetasMensaisResumo {
  mesReferencia: string;
  receitaTotal: number;
  receitaTotalBruta: number;
  receitaElegivelMetas: number;
  receitaExcluidaMetas: number;
  despesaTotal: number;
  despesaTotalBruta: number;
  despesaTotalReembolsada: number;
  percentualTotalComprometido: number;
  valorTotalReservado: number;
  percentualRestante: number;
  valorRestanteAntesDespesas: number;
  saldoFinal: number;
  valorFaltante: number;
  status: MetaMensalStatus;
  alertas: string[];
  metas: MetaMensal[];
}

export interface CriarMetaMensalRequest {
  nome: string;
  percentualReceita: number;
  mesReferencia?: string;
}

export interface AtualizarMetaMensalRequest {
  id: string;
  nome: string;
  percentualReceita: number;
}
