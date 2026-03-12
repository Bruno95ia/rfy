/**
 * Constantes SUPHO — pesos ITSMO, faixas de nível, limites de gaps e subíndices
 * Alinhado aos pilares: Cultura Organizacional (A), Humano e Liderança (B), Comercial e Performance (C)
 */

import type { SuphoNivel } from '@/types/supho';

/** Pesos do ITSMO: Cultura 40%, Humano 35%, Performance 25% */
export const ITSMO_WEIGHTS = {
  cultura: 0.4,
  humano: 0.35,
  performance: 0.25,
} as const;

/** Pilares SUPHO (Bloco A/B/C) — nomenclatura alinhada ao Kit Diagnóstico e Playbooks */
export const SUPHO_PILARES = {
  A: {
    id: 'A',
    nome: 'Cultura Organizacional',
    nomeCurto: 'Cultura',
    sigla: 'IC',
    playbook: 'Playbook Cultura & Performance',
    descricao: 'Valores, propósito, coerência liderança e comunicação.',
  },
  B: {
    id: 'B',
    nome: 'Humano e Liderança',
    nomeCurto: 'Humano',
    sigla: 'IH',
    playbook: 'Playbook Humano & Liderança',
    descricao: 'Engajamento, segurança psicológica, feedback e bem-estar.',
  },
  C: {
    id: 'C',
    nome: 'Comercial e Performance',
    nomeCurto: 'Performance',
    sigla: 'IP',
    playbook: 'Playbook Comercial & Marketing',
    descricao: 'Metas, indicadores, feedback de performance e melhoria contínua.',
  },
} as const;

/** Faixas ITSMO → Nível (1–5) */
export const ITSMO_LEVEL_BANDS: Array<{ min: number; max: number; nivel: SuphoNivel; label: string }> = [
  { min: 0, max: 39, nivel: 1, label: 'Reativo' },
  { min: 40, max: 59, nivel: 2, label: 'Consciente' },
  { min: 60, max: 74, nivel: 3, label: 'Estruturado' },
  { min: 75, max: 89, nivel: 4, label: 'Integrado' },
  { min: 90, max: 100, nivel: 5, label: 'Evolutivo' },
];

/** Faixas IC para interpretação (0–100) */
export const IC_BANDS = [
  { min: 85, max: 100, label: 'Cultura sólida' },
  { min: 70, max: 84, label: 'Cultura consistente' },
  { min: 50, max: 69, label: 'Cultura parcial' },
  { min: 0, max: 49, label: 'Cultura frágil' },
] as const;

/** Faixas IH para interpretação */
export const IH_BANDS = [
  { min: 85, max: 100, label: 'Alto engajamento e segurança emocional' },
  { min: 70, max: 84, label: 'Engajamento saudável' },
  { min: 50, max: 69, label: 'Engajamento vulnerável' },
  { min: 0, max: 49, label: 'Desconexão humana' },
] as const;

/** Faixas IP para interpretação */
export const IP_BANDS = [
  { min: 85, max: 100, label: 'Alta performance sustentável' },
  { min: 70, max: 84, label: 'Performance consistente' },
  { min: 50, max: 69, label: 'Performance limitada' },
  { min: 0, max: 49, label: 'Performance reativa' },
] as const;

/** Gap C-H / C-P: 0–5 alinhado, 6–10 leve, >10 desconexão */
export const GAP_BANDS = [
  { min: 0, max: 5, label: 'Alinhado' },
  { min: 6, max: 10, label: 'Leve desalinhamento' },
  { min: 11, max: 100, label: 'Desconexão' },
] as const;

/** Subíndices em escala 1–5: ≥4 seguro, 3–3.9 moderado, <3 inseguro */
export const SUBINDEX_BANDS = [
  { min: 4, max: 5, label: 'Alto' },
  { min: 3, max: 3.99, label: 'Moderado' },
  { min: 1, max: 2.99, label: 'Baixo' },
] as const;

/** Limiar para item crítico (abaixo disso aparece no ranking) */
export const CRITICAL_ITEM_THRESHOLD = 3.5;

/** Escala Likert: 1–5. Fator para normalizar para 0–100: (mean - 1) / 4 * 100 */
export const LIKERT_MIN = 1;
export const LIKERT_MAX = 5;
export const LIKERT_RANGE = LIKERT_MAX - LIKERT_MIN;
