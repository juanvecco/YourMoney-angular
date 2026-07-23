import { Despesa } from './despesa.model';

export interface DespesaRecorrenteRequest {
  descricao: string;
  valorPrevisto: number;
  idContaFinanceira: string;
  idTipoDespesa: string;
  idNaturezaDespesa: string;
  idCategoria: string;
  dataVencimento: string;
  dataInicio: string;
  dataTermino?: string | null;
}

export interface DespesaRecorrenteResponse {
  id: string;
  descricao: string;
  valorPrevisto: number;
  idContaFinanceira: string;
  contaDescricao: string;
  idTipoDespesa: string;
  tipoDescricao: string;
  idNaturezaDespesa: string;
  naturezaDescricao: string;
  idCategoria: string;
  categoriaDescricao: string;
  diaVencimento: number;
  dataInicio: string;
  dataTermino?: string | null;
  ativa: boolean;
}

export interface ListarDespesasRecorrentesResponse {
  itens: DespesaRecorrenteResponse[];
}

export type StatusSugestaoDespesaRecorrente = 'Pendente' | 'Confirmada' | 'Ignorada';

export interface SugestaoDespesaRecorrenteResponse {
  ocorrenciaId: string;
  despesaRecorrenteId: string;
  mesReferencia: string;
  status: StatusSugestaoDespesaRecorrente;
  descricao: string;
  valorPrevisto: number;
  dataSugerida: string;
  idContaFinanceira: string;
  contaDescricao: string;
  idTipoDespesa: string;
  idNaturezaDespesa: string;
  idCategoria: string;
  despesaConfirmadaId?: string | null;
}

export interface ListarSugestoesDespesasRecorrentesResponse {
  mes: number;
  ano: number;
  itens: SugestaoDespesaRecorrenteResponse[];
}

export interface ConfirmarSugestaoDespesaRecorrenteRequest {
  descricao?: string;
  valor?: number;
  data?: string;
  idContaFinanceira?: string;
  idTipoDespesa?: string;
  idNaturezaDespesa?: string;
  idCategoria?: string;
}

export interface EncerrarDespesaRecorrenteRequest {
  dataTermino: string;
}

export type ConfirmarSugestaoDespesaRecorrenteResponse = Despesa;
