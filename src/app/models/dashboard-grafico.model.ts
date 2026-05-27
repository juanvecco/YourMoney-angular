export type EstadoGraficoDashboard = 'carregando' | 'pronto' | 'vazio' | 'erro';

export type TipoItemGraficoFinanceiro = 'receita' | 'despesa' | 'investimento' | 'saldo';

export interface PeriodoReferencia {
  mes: number;
  ano: number;
  rotulo: string;
}

export interface ItemGraficoFinanceiro {
  id: string;
  rotulo: string;
  tipo: TipoItemGraficoFinanceiro;
  valor: number;
  percentual?: number;
  cor?: string;
}

export interface ResumoGraficoDashboard {
  periodoReferencia: PeriodoReferencia;
  total: number;
  items: ItemGraficoFinanceiro[];
  estado: EstadoGraficoDashboard;
  mensagemEstado?: string;
}
