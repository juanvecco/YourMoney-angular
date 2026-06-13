export interface Receita {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  mesReferencia?: string;
}

export interface CriarReceitaRequest {
  descricao: string;
  valor: number;
  data: string;
  mesReferencia: string;
}

export interface CriarReceitaResponse extends Receita {
  mesReferencia: string;
}

export interface AtualizarReceitaRequest extends CriarReceitaRequest {
  id: string;
}
