import { environment } from '../../environments/environment';

export const IMAGEM_OBJETIVO_CARRO = '/assets/objectives/city-lx-sedan.jpg';
export const IMAGEM_OBJETIVO_LIBERDADE = '/assets/objectives/financial-freedom.jpg';
export const IMAGEM_OBJETIVO_LONGO_PRAZO = '/assets/objectives/long-term.jpg';
export const IMAGEM_OBJETIVO_EMERGENCIA = '/assets/objectives/emergency-fund.jpg';

export function resolverImagemObjetivo(imagemUrl: string | null | undefined): string | null {
  if (!imagemUrl) return null;
  if (imagemUrl.startsWith('/uploads/')) {
    const origemApi = environment.apiUrl.replace(/\/api\/?$/, '');
    return `${origemApi}${imagemUrl}`;
  }
  return imagemUrl;
}

export function imagemSugeridaObjetivo(nome: string, descricao?: string | null): string | null {
  const contexto = `${nome} ${descricao ?? ''}`.toLocaleLowerCase('pt-BR');
  if (/(carro|veículo|veiculo|city|sedan)/.test(contexto)) return IMAGEM_OBJETIVO_CARRO;
  if (/(liberdade|independência|independencia)/.test(contexto)) return IMAGEM_OBJETIVO_LIBERDADE;
  if (/(longo prazo|futuro|aposentadoria)/.test(contexto)) return IMAGEM_OBJETIVO_LONGO_PRAZO;
  if (/(emergência|emergencia|segurança|seguranca)/.test(contexto)) return IMAGEM_OBJETIVO_EMERGENCIA;
  return null;
}
