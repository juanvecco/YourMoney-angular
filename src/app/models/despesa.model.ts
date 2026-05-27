export interface Despesa {
  id: string;
  data: string;
  mesReferencia?: string;
  descricao: string;
  valor: number;
  idContaFinanceira: string;
  idCategoria: string;
  parcelamentoId?: string | null;
  numeroParcela?: number | null;
  totalParcelas?: number | null;
  valorTotalParcelamento?: number | null;
}

export interface ContaFinanceira {
  id: string;
  descricao: string;
}

export interface Categoria {
  id: string;
  descricao: string;
  tipoTransacao: number;
  categoriaPaiId?: string | null;
}

export interface CriarDespesaRequest {
  descricao: string;
  valor: number;
  data: string;
  mesReferencia: string;
  idContaFinanceira: string;
  idCategoria: string;
}

export interface AtualizarDespesaRequest extends CriarDespesaRequest {
  id: string;
}

export interface CriarParcelamentoRequest {
  descricao: string;
  valorTotal: number;
  dataInicial: string;
  mesReferenciaInicial: string;
  quantidadeParcelas: number;
  idContaFinanceira: string;
  idCategoria: string;
}

export interface ParcelaDespesa extends Despesa {
  parcelamentoId: string;
  numeroParcela: number;
  totalParcelas: number;
  valorTotalParcelamento: number;
}

export interface CriarParcelamentoResponse {
  parcelamentoId: string;
  valorTotal: number;
  quantidadeParcelas: number;
  parcelas: ParcelaDespesa[];
}

export interface ParcelaPreview {
  numeroParcela: number;
  totalParcelas: number;
  valor: number;
  data: string;
  mesReferencia: string;
}
