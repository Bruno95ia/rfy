/**
 * Tipos SUPHO — Diagnóstico, Painel de Maturidade, PAIP, Rituais, Certificação
 */

/** Bloco do questionário: A = Cultura, B = Humano, C = Performance */
export type SuphoBlock = 'A' | 'B' | 'C';

/** Peso interno do item (crítico 3, importante 2, padrão 1) */
export type SuphoItemWeight = 1 | 2 | 3;

/** Nível de maturidade SUPHO (1–5) */
export type SuphoNivel = 1 | 2 | 3 | 4 | 5;

/** Nível de certificação */
export type SuphoCertLevel = 'bronze' | 'prata' | 'ouro';

export interface SuphoQuestion {
  id: string;
  block: SuphoBlock;
  internalWeight: SuphoItemWeight;
  questionText?: string;
  /** Para subíndices: ex. A11, A12, B6 para ISE */
  itemCode?: string;
}

export interface SuphoAnswer {
  respondentId: string;
  questionId: string;
  value: number; // 1–5 Likert
}

export interface SuphoRespondent {
  id: string;
  campaignId: string;
  timeArea?: string;
  unit?: string;
  role?: string;
  respondedAt?: string;
}

/** Resposta agregada por pergunta (média Likert 1–5) */
export interface SuphoQuestionAverage {
  questionId: string;
  block: SuphoBlock;
  internalWeight: SuphoItemWeight;
  itemCode?: string;
  average: number;
  count: number;
}

/** Resultado do diagnóstico: índices 0–100, nível e subíndices */
export interface SuphoDiagnosticResult {
  /** Índice Cultural (bloco A) 0–100 */
  ic: number;
  /** Índice Humano (bloco B) 0–100 */
  ih: number;
  /** Índice Performance (bloco C) 0–100 */
  ip: number;
  /** ITSMO = IC×0,40 + IH×0,35 + IP×0,25 */
  itsmo: number;
  /** Nível 1–5 (Reativo a Evolutivo) */
  nivel: SuphoNivel;
  /** Gap |IC - IH| */
  gapCH: number;
  /** Gap |IC - IP| */
  gapCP: number;
  /** Subíndice Segurança Emocional (média itens A11, A12, B6 em escala 1–5) */
  ise: number;
  /** Subíndice Pertencimento (média A2, A5, B8) */
  ipt: number;
  /** Subíndice Consistência de Liderança (média A3, A6, B5) */
  icl: number;
  /** Tamanho da amostra válida */
  sampleSize: number;
  /** Médias por pergunta (para ranking de itens críticos) */
  questionAverages?: SuphoQuestionAverage[];
}

/** Perfil predominante para matriz visual */
export type SuphoPerfilPredominante =
  | 'cultura_maior'
  | 'humano_maior'
  | 'performance_maior'
  | 'evolutivo'
  | 'fragmentado';
