export type NaturezaReceita = 'RendaDisponivel' | 'EntradaVinculadaDespesa' | 'Reembolso';

export interface Receita {
  id: string;
  descricao: string;
  valor: number;
  data: string;
  mesReferencia?: string;
  natureza: NaturezaReceita;
  consideraNasMetas: boolean;
  despesaVinculadaId?: string | null;
  despesaVinculadaDescricao?: string | null;
  valorAbatidoEmDespesa: number;
}

export interface CriarReceitaRequest {
  descricao: string;
  valor: number;
  data: string;
  mesReferencia: string;
  natureza: NaturezaReceita;
  despesaVinculadaId?: string | null;
}

export interface CriarReceitaResponse extends Receita {
  mesReferencia: string;
}

export interface AtualizarReceitaRequest extends CriarReceitaRequest {
  id: string;
  consideraNasMetas?: boolean;
  despesaVinculadaDescricao?: string | null;
  valorAbatidoEmDespesa?: number;
}
