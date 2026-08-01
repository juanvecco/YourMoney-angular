export type MetaMensalStatus = 'disponivel' | 'zerado' | 'faltando';
export type TipoDefinicaoMeta = 'Percentual' | 'Valor';

export interface MetaMensal {
  id: string;
  nome: string;
  tipoDefinicao: TipoDefinicaoMeta;
  percentualReceita: number | null;
  valorMeta: number | null;
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
  percentualTotalComprometido: number | null;
  valorTotalReservado: number;
  percentualRestante: number | null;
  valorRestanteAntesDespesas: number;
  saldoFinal: number;
  valorFaltante: number;
  status: MetaMensalStatus;
  alertas: string[];
  metas: MetaMensal[];
}

interface CriarMetaMensalRequestBase {
  nome: string;
  mesReferencia?: string;
}

export type CriarMetaMensalRequest =
  | (CriarMetaMensalRequestBase & {
      tipoDefinicao: 'Percentual';
      percentualReceita: number;
      valorMeta?: null;
    })
  | (CriarMetaMensalRequestBase & {
      tipoDefinicao: 'Valor';
      percentualReceita?: null;
      valorMeta: number;
    });

interface AtualizarMetaMensalRequestBase {
  id: string;
  nome: string;
}

export type AtualizarMetaMensalRequest =
  | (AtualizarMetaMensalRequestBase & {
      tipoDefinicao: 'Percentual';
      percentualReceita: number;
      valorMeta?: null;
    })
  | (AtualizarMetaMensalRequestBase & {
      tipoDefinicao: 'Valor';
      percentualReceita?: null;
      valorMeta: number;
    });
