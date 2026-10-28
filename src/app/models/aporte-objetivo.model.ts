import { AporteObjetivo } from './meta-mensal.model';
export type { AporteObjetivo };
export interface ConfirmarAporteObjetivoRequest {
  valor: number; dataConfirmacao: string; investimentoId?: string | null; operacaoId: string;
}
export interface AlocarAporteObjetivoRequest { investimentoId: string; }
