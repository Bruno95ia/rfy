import type { SuphoQuestionAverage } from '@/types/supho';

/**
 * Se a campanha tem `question_ids`, só essas perguntas entram nas médias por bloco.
 * `null` ou `[]` = todas as perguntas com resposta (comportamento legado).
 */
export function filterQuestionAveragesForCampaign(
  averages: SuphoQuestionAverage[],
  campaignQuestionIds: string[] | null | undefined
): SuphoQuestionAverage[] {
  if (!Array.isArray(campaignQuestionIds) || campaignQuestionIds.length === 0) {
    return averages;
  }
  const allowed = new Set(campaignQuestionIds);
  return averages.filter((q) => allowed.has(q.questionId));
}
