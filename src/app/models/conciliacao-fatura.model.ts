export interface ResumoFatura {
  idContaFinanceira: string;
  mes: number;
  ano: number;
  valorInformado: number | null;
  totalCadastrado: number;
  diferenca: number | null;
  quantidadeDespesas: number;
  quantidadePendentes: number;
}

export interface SalvarFaturaRequest {
  mes: number;
  ano: number;
  valorInformado: number;
}
