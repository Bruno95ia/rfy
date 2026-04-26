import { computeImpact, suphoDiagnosticToResult } from '@/lib/rfy/impact-engine';
import { getPaipExecutionRate, type PaipDbClient } from '@/lib/supho/paip-execution-rate';

/** Corpo JSON para POST /predict/forecast com multiplicadores RFY alinhados ao dashboard. */
export async function buildForecastAiRequestBody(
  supabase: PaipDbClient,
  orgId: string
): Promise<{ org_id: string; rfy_score?: number; execution_rate?: number }> {
  let rfyScore: number | undefined;
  let executionRate: number | undefined;

  const rate = await getPaipExecutionRate(supabase, orgId);
  if (rate != null) executionRate = rate;

  const { data: latest } = await supabase
    .from('supho_diagnostic_results')
    .select('ic, ih, ip')
    .eq('org_id', orgId)
    .order('computed_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (latest) {
    const imp = computeImpact(suphoDiagnosticToResult(Number(latest.ic), Number(latest.ih), Number(latest.ip)), {
      pipelineOpenValue: 1,
    });
    rfyScore = imp.rfyScore;
  }

  return {
    org_id: orgId,
    rfy_score: rfyScore,
    execution_rate: executionRate,
  };
}
