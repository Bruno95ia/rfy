/**
 * Extrai scores de governança (G) e higiene (H) em [0,1] a partir de pillar_scores_json do relatório.
 */
export function governanceAndHygieneFromPillarScores(
  pillarScores: Record<string, unknown> | null | undefined
): { governanceScore: number; hygieneScore: number } {
  const read = (key: string, fallback: number): number => {
    const raw = (pillarScores?.[key] as { score?: number } | undefined)?.score;
    if (typeof raw !== 'number' || Number.isNaN(raw)) return fallback;
    return Math.max(0, Math.min(1, raw / 100));
  };
  return {
    governanceScore: read('post_proposal_stagnation', 0.7),
    hygieneScore: read('pipeline_hygiene', 0.7),
  };
}
