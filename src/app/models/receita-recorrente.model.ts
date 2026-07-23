import { CriarReceitaResponse, NaturezaReceita } from './receita.model';

export interface ReceitaRecorrenteRequest {
  descricao: string;
  valorPrevisto: number;
  idContaFinanceira: string;
  natureza: Exclude<NaturezaReceita, 'Reembolso'>;
  ehSalario: boolean;
  consideraReservaEmergencia: boolean;
  dataRecebimento: string;
  dataInicio: string;
  dataTermino?: string | null;
}

export interface ReceitaRecorrenteResponse {
  id: string;
  descricao: string;
  valorPrevisto: number;
  idContaFinanceira: string;
  contaDescricao: string;
  natureza: Exclude<NaturezaReceita, 'Reembolso'>;
  ehSalario: boolean;
  consideraReservaEmergencia: boolean;
  diaRecebimento: number;
  dataInicio: string;
  dataTermino?: string | null;
  ativa: boolean;
}

export interface ListarReceitasRecorrentesResponse {
  itens: ReceitaRecorrenteResponse[];
}

export type StatusSugestaoReceitaRecorrente = 'Pendente' | 'Confirmada' | 'Ignorada';

export interface SugestaoReceitaRecorrenteResponse {
  ocorrenciaId: string;
  receitaRecorrenteId: string;
  mesReferencia: string;
  status: StatusSugestaoReceitaRecorrente;
  descricao: string;
  valorPrevisto: number;
  dataSugerida: string;
  idContaFinanceira: string;
  contaDescricao: string;
  natureza: Exclude<NaturezaReceita, 'Reembolso'>;
  receitaConfirmadaId?: string | null;
}

export interface ListarSugestoesReceitasRecorrentesResponse {
  mes: number;
  ano: number;
  itens: SugestaoReceitaRecorrenteResponse[];
}

export interface ConfirmarSugestaoReceitaRecorrenteRequest {
  descricao?: string;
  valor?: number;
  data?: string;
  idContaFinanceira?: string;
  natureza?: Exclude<NaturezaReceita, 'Reembolso'>;
}

export interface EncerrarReceitaRecorrenteRequest {
  dataTermino: string;
}

export interface ProjecaoReservaEmergenciaItem {
  receitaRecorrenteId: string;
  descricao: string;
  contaDescricao: string;
  ehSalario: boolean;
  valorMensal: number;
  valorSeisMeses: number;
  valorDozeMeses: number;
}

export interface ProjecaoReservaEmergenciaResponse {
  itens: ProjecaoReservaEmergenciaItem[];
}

export type ConfirmarSugestaoReceitaRecorrenteResponse = CriarReceitaResponse;
