/**
 * @deprecated O motor de impacto usa penalidades por degraus (impact-engine.ts).
 * Mantido apenas para compatibilidade de import legado.
 */
export type ImpactMappingConfig = Record<string, never>;
export const DEFAULT_IMPACT_MAPPING = {} as ImpactMappingConfig;
