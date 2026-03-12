/**
 * Cálculo de métricas de Unit Economics: LTV, Churn, CAC
 */

export type UnitEconomicsInput = {
  won: Array<{ value: number | null; company_name: string | null }>;
  lost: Array<{ value: number | null; company_name: string | null }>;
  open: Array<{ value: number | null }>;
  cacManual?: number | null;
  marketingSpendMonthly?: number | null;
};

export type UnitEconomicsResult = {
  ltv_computed: number | null;
  churn_rate: number | null;
  win_rate: number | null;
  avg_deal_value: number | null;
  deals_won_count: number;
  deals_lost_count: number;
  deals_open_count: number;
  cac_manual: number | null;
  marketing_spend_monthly: number | null;
  ltv_cac_ratio: number | null;
};

export function computeUnitEconomics(input: UnitEconomicsInput): UnitEconomicsResult {
  const won = input.won.filter((d) => d.value != null && d.value > 0);
  const lost = input.lost;
  const open = input.open;

  const dealsWon = won.length;
  const dealsLost = lost.length;
  const dealsOpen = open.length;
  const totalClosed = dealsWon + dealsLost;

  const winRate = totalClosed > 0 ? dealsWon / totalClosed : null;
  const churnRate = totalClosed > 0 ? dealsLost / totalClosed : null;

  const values = won.map((d) => Number(d.value));
  const avgDealValue =
    values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;

  // LTV: para B2B one-time, aproximamos pelo ticket médio ganho
  // Em modelo recorrente: LTV = ARPU * (1/churn)
  const ltvComputed = avgDealValue;

  const cacManual = input.cacManual ?? null;
  const marketingSpend = input.marketingSpendMonthly ?? null;

  let ltvCacRatio: number | null = null;
  if (ltvComputed != null && ltvComputed > 0 && cacManual != null && cacManual > 0) {
    ltvCacRatio = ltvComputed / cacManual;
  }

  return {
    ltv_computed: ltvComputed,
    churn_rate: churnRate,
    win_rate: winRate,
    avg_deal_value: avgDealValue,
    deals_won_count: dealsWon,
    deals_lost_count: dealsLost,
    deals_open_count: dealsOpen,
    cac_manual: cacManual,
    marketing_spend_monthly: marketingSpend,
    ltv_cac_ratio: ltvCacRatio,
  };
}
