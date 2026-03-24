/**
 * Tabelas de leitura executiva SUPHO — texto para relatório por faixa/valor
 * Alinhado ao Resumo Executivo do Diagnóstico e aos Playbooks (Cultura & Performance, Humano & Liderança, Comercial & Marketing).
 */

import type { SuphoNivel } from '@/types/supho';
import type { SystemsMaturityAssessment } from '@/lib/supho/systems-maturity';

/** Leitura executiva por nível ITSMO (1–5) — base para resumo do diagnóstico */
const TEXTS_ITSMO: Record<SuphoNivel, string> = {
  1: 'A organização opera em modo reativo: baixa clareza de propósito, liderança pouco coerente com valores e práticas fragmentadas. Recomenda-se iniciar pelo Pilar Cultura e rituais de alinhamento.',
  2: 'Há reconhecimento da importância da cultura e do fator humano, porém falta consistência e sistematização. Priorize o Playbook Cultura & Performance e a cadência de feedback (Humano & Liderança).',
  3: 'Cultura em estruturação e liderança mais participativa; persistem lacunas de engajamento e de mensuração de performance. Fortaleça rituais e vincule KRs do PAIP aos indicadores do CRM.',
  4: 'Cultura consolidada, comunicação ativa e coerência entre discurso e prática; sinergia crescente entre pessoas e resultados. Mantenha rituais e use o diagnóstico para certificação e evolução contínua.',
  5: 'Maturidade integrada: autogestão, alto engajamento e performance sustentável orientada por propósito. Foco em manutenção, certificação e disseminação de práticas.',
};

/** IC — Pilar 1: Cultura Organizacional (Bloco A) */
const TEXTS_IC = [
  { min: 85, text: 'Valores internalizados e presentes nas decisões do dia a dia. Cultura sólida; manter rituais e reconhecimento.' },
  { min: 70, text: 'Cultura bem disseminada; reforçar rituais, comunicação e reconhecimento para consolidar.' },
  { min: 50, text: 'Entendimento conceitual de valores, com vivência prática ainda insuficiente. Trabalhar alinhamento e exemplos da liderança.' },
  { min: 0, text: 'Cultura não percebida como guia real. Priorizar Pilar 1 (Cultura) e clareza de propósito antes de avançar em metas.' },
] as const;

/** IH — Pilar Humano e Liderança (Bloco B) */
const TEXTS_IH = [
  { min: 85, text: 'Alto engajamento, equilíbrio e senso de pertencimento. Manter segurança psicológica e canais de escuta.' },
  { min: 70, text: 'Maioria engajada; existem resistências pontuais. Reforçar feedback e espaços de diálogo (Playbook Humano & Liderança).' },
  { min: 50, text: 'Motivação e segurança emocional vulneráveis em parte das equipes. Priorizar feedback, reconhecimento e bem-estar.' },
  { min: 0, text: 'Desmotivação e pouco diálogo emocional efetivo. Intervir no Pilar Humano antes de exigir resultados; cuidar da liderança.' },
] as const;

/** IP — Pilar 2: Comercial e Performance (Bloco C) */
const TEXTS_IP = [
  { min: 85, text: 'Indicadores claros, acompanhados e usados para evolução. Performance sustentável; alinhar KRs do PAIP ao CRM.' },
  { min: 70, text: 'Metas definidas; ampliar revisões e feedbacks regulares e integrar áreas (Comercial & Marketing).' },
  { min: 50, text: 'Acompanhamento de metas esporádico e pouca integração entre áreas. Estruturar indicadores e cadência de revisão.' },
  { min: 0, text: 'Execução sob pressão e pouca mensuração. Evitar cobrança pura de resultado; primeiro estabelecer cultura e ritmo (Cultura e Humano).' },
] as const;

/** Gaps: alinhamento entre Cultura ↔ Humano e Cultura ↔ Performance */
const TEXTS_GAP_ALIGNED: Array<{ max: number; label: string; textCH: string; textCP: string }> = [
  { max: 5, label: 'Alinhado', textCH: 'Cultura vivida pelas pessoas de forma equilibrada. Manter rituais e escuta.', textCP: 'Cultura direcionando a performance. Vincular KRs do PAIP aos indicadores.' },
  { max: 10, label: 'Leve', textCH: 'Leve diferença entre o que se prega e o que o time pratica. Reforçar exemplos da liderança e comunicação.', textCP: 'Metas conectadas aos valores, com consistência a ganhar. Revisar prioridades no PAIP.' },
  { max: 100, label: 'Desconexão', textCH: 'Risco de incoerência: discurso não reflete a experiência interna. Priorizar Pilar Cultura e Humano antes de metas.', textCP: 'Resultados perseguidos sem base cultural clara. Alinhar propósito e depois performance.' },
];

/** ISE — Segurança psicológica (itens A11, A12, B6); escala 1–5 */
const TEXTS_ISE = [
  { min: 4, text: 'Segurança psicológica presente: espaço para expressar ideias e erros. Manter e ampliar.' },
  { min: 3, text: 'Há espaço para diálogo; vulnerabilidade ainda limitada. Reforçar no Playbook Humano & Liderança.' },
  { min: 0, text: 'Medo de julgamento ou punição; reduz inovação e confiança. Priorizar segurança emocional antes de cobrar resultados.' },
] as const;

/** IPT — Orgulho e vínculo (itens A2, A5, B8); escala 1–5 */
const TEXTS_IPT = [
  { min: 4, text: 'Orgulho e conexão emocional com a organização. Reforçar propósito e reconhecimento.' },
  { min: 3, text: 'Identificação com o propósito, mas não uniforme. Trabalhar comunicação e alinhamento por área.' },
  { min: 0, text: 'Vínculo emocional frágil; risco de desengajamento. Intervir em clima e liderança (Pilar Humano).' },
] as const;

/** ICL — Liderança como exemplo (itens A3, A6, B5); escala 1–5 */
const TEXTS_ICL = [
  { min: 4, text: 'Liderança traduz valores em atitudes consistentes. Manter coerência e feedback ascendente.' },
  { min: 3, text: 'Liderança presente; reforçar coerência e reconhecimento (Playbook Humano & Liderança).' },
  { min: 0, text: 'Time não vê a liderança como exemplo dos valores. Priorizar desenvolvimento de líderes e alinhamento.' },
] as const;

function getBandText<T extends { min: number; text: string }>(bands: readonly T[], value: number): string {
  const band = bands.find((b) => value >= b.min);
  return band?.text ?? '';
}

function getGapText(gap: number, isCH: boolean): string {
  const row = TEXTS_GAP_ALIGNED.find((r) => gap <= r.max) ?? TEXTS_GAP_ALIGNED[TEXTS_GAP_ALIGNED.length - 1]!;
  return isCH ? row.textCH : row.textCP;
}

/** Retorna o texto executivo do ITSMO pelo nível (1–5) */
export function getExecutiveTextITSMO(nivel: SuphoNivel): string {
  return TEXTS_ITSMO[nivel] ?? TEXTS_ITSMO[1];
}

/** Retorna o texto executivo do IC (0–100) */
export function getExecutiveTextIC(ic: number): string {
  return getBandText(TEXTS_IC, ic);
}

/** Retorna o texto executivo do IH (0–100) */
export function getExecutiveTextIH(ih: number): string {
  return getBandText(TEXTS_IH, ih);
}

/** Retorna o texto executivo do IP (0–100) */
export function getExecutiveTextIP(ip: number): string {
  return getBandText(TEXTS_IP, ip);
}

/** Retorna o texto executivo do gap Cultura–Humano */
export function getExecutiveTextGapCH(gapCH: number): string {
  return getGapText(gapCH, true);
}

/** Retorna o texto executivo do gap Cultura–Performance */
export function getExecutiveTextGapCP(gapCP: number): string {
  return getGapText(gapCP, false);
}

/** Subíndices em escala 1–5 */
export function getExecutiveTextISE(ise: number): string {
  return getBandText(TEXTS_ISE, ise);
}

export function getExecutiveTextIPT(ipt: number): string {
  return getBandText(TEXTS_IPT, ipt);
}

export function getExecutiveTextICL(icl: number): string {
  return getBandText(TEXTS_ICL, icl);
}

/** Matriz visual: perfil predominante e mensagem executiva */
export type SuphoPerfilMessage =
  | 'Inspiradora, porém inconsistente'
  | 'Cuidada, mas sem direção clara'
  | 'Orientada a resultado, mas desgastada'
  | 'Evolutiva e consciente'
  | 'Fragmentada e reativa';

/** Perfil predominante — orientação para PAIP e priorização de pilares */
const PERFIL_MESSAGES: Record<SuphoPerfilMessage, string> = {
  'Inspiradora, porém inconsistente':
    'Forte identidade e propósito; falta traduzir cultura em práticas e indicadores (PAIP: KRs de performance e Comercial).',
  'Cuidada, mas sem direção clara':
    'Energia e vínculo nas pessoas; falta propósito claro e metas objetivas. Priorizar Cultura e depois Comercial & Performance.',
  'Orientada a resultado, mas desgastada':
    'Performance acima do cuidado com pessoas e cultura; risco de cansaço e desmotivação. Reforçar Pilar Humano e Liderança.',
  'Evolutiva e consciente':
    'Maturidade integrada entre propósito, pessoas e resultados. Manter rituais, PAIP e caminho para certificação.',
  'Fragmentada e reativa':
    'Operação sem alinhamento e com baixa clareza cultural e emocional. Iniciar por Cultura, depois Humano e Performance.',
};

export function getPerfilPredominante(ic: number, ih: number, ip: number): SuphoPerfilMessage {
  const high = ic >= 70 && ih >= 70 && ip >= 70;
  const low = ic < 60 && ih < 60 && ip < 60;
  if (high) return 'Evolutiva e consciente';
  if (low) return 'Fragmentada e reativa';
  if (ic >= ih && ic >= ip) return 'Inspiradora, porém inconsistente';
  if (ih >= ic && ih >= ip) return 'Cuidada, mas sem direção clara';
  return 'Orientada a resultado, mas desgastada';
}

export function getExecutiveTextPerfil(perfil: SuphoPerfilMessage): string {
  return PERFIL_MESSAGES[perfil] ?? '';
}

/** Parágrafo sobre imaturidade de sistemas (CRM/ERP) no diagnóstico */
export function getSystemsMaturityNarrative(assessment: SystemsMaturityAssessment): string {
  if (assessment.ipPenalty <= 0) {
    return 'Integração de sistemas: CRM ativo no RFY e/ou ERP declarado como integrado — base adequada para dados de pipeline e governança.';
  }
  const intro =
    'Além das respostas do questionário, o sistema considerou sinais de maturidade de dados e sistemas: ';
  return intro + assessment.reasons.join(' ');
}

/** Texto de apoio quando há documentos de contexto organizacional preenchidos */
export function getOrgContextNarrative(summary: string | null | undefined): string {
  const t = (summary ?? '').trim();
  if (!t) {
    return 'Contexto documental da organização ainda não foi preenchido no RFY. Completar em Configurações → Contexto da organização enriquece o diagnóstico.';
  }
  return 'Contexto organizacional registrado (para referência do diagnóstico):\n\n' + t;
}
