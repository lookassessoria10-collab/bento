// Formato (DTO) entregue à página pública de um link compartilhado: somente dados já autorizados e minimizados.
// Sem IDs internos, sem nomes de pessoas, sem endereços, horários ou contatos.
import type { ShareSecao, SharePublico } from "@/lib/share-config";

export interface ShareDto {
  titulo: string;
  subtitulo: string;
  publico: SharePublico;
  organizacao: string;
  demo: boolean;
  referencia: string;
  ultimaAtualizacao: string | null;
  geradoEm: string;
  periodo: { de: string | null; ate: string | null };
  secoes: ShareSecao[];
  indicadores?: {
    total: number;
    porFase: Record<string, number>;
    visitasRealizadas: number;
    visitasAgendadas: number;
    ocorrenciasAbertas: number | null;
    proximos30: number | null;
  };
  graficos?: {
    culturas: { label: string; value: number }[];
    statusPorCultura: { label: string; counts: Record<string, number>; total: number }[];
    visitasMes: { mes: string; realizadas: number; agendadas: number }[];
  };
  calendario?: { data: string; tipo: string; status: string; ensaio: string | null }[];
  ocorrencias?: { titulo: string; gravidade: string; status: string; data: string; ensaio: string }[];
  resultadosDemo?: { ensaio: string; titulo: string; variavel: string; unidade: string | null; pontos: { data: string; valor: number | null; motivo: string | null }[] }[];
  resultadosReais?: { ensaio: string; variavel: string; unidade: string | null; sintese: string; situacao: string; dataReferencia: string | null; fonte: string | null }[];
  documentos?: { nome: string; tipo: string; data: string | null }[];
  economia?: { linhas: { atividade: string; eventos_mes: number; minutos_antes: number; minutos_bento: number; antesMes: number; bentoMes: number; economiaMes: number }[]; antes: number; bento: number; economia: number; percentual: number | null };
}
