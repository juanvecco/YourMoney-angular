export interface Investimento {
  id: string;
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  valorAtual: number;
  dataInvestimento: string;
  dataResgate: string | null;
  ativo: boolean;
}

export interface CriarInvestimentoRequest {
  nome: string;
  descricao: string;
  tipo: string;
  quantidade: number;
  precoMedio: number;
  valorAtual: number;
  dataInvestimento: string;
}

export interface CriarInvestimentoResponse extends Investimento {}

export interface AtualizarInvestimentoRequest extends CriarInvestimentoRequest {
  id: string;
  dataResgate: string | null;
  ativo: boolean;
}
