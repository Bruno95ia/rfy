import { describe, expect, it } from 'vitest';
import { filterQuestionAveragesForCampaign } from '@/lib/supho/campaign-questions';
import type { SuphoQuestionAverage } from '@/types/supho';

const base = (id: string, block: 'A' | 'B' | 'C'): SuphoQuestionAverage => ({
  questionId: id,
  block,
  internalWeight: 1,
  average: 3,
  count: 2,
});

describe('filterQuestionAveragesForCampaign', () => {
  const averages: SuphoQuestionAverage[] = [base('q1', 'A'), base('q2', 'B'), base('q3', 'C')];

  it('com null ou lista vazia devolve todas as médias', () => {
    expect(filterQuestionAveragesForCampaign(averages, null)).toEqual(averages);
    expect(filterQuestionAveragesForCampaign(averages, undefined)).toEqual(averages);
    expect(filterQuestionAveragesForCampaign(averages, [])).toEqual(averages);
  });

  it('filtra apenas os question_ids da campanha', () => {
    const filtered = filterQuestionAveragesForCampaign(averages, ['q1', 'q3']);
    expect(filtered.map((q) => q.questionId)).toEqual(['q1', 'q3']);
  });
});
