/**
 * Contrato de integração PipeRun API → RFY.
 * Normalização alinhada ao webhook e ao schema opportunities/activities.
 */

export type PipeRunConfig = {
  apiUrl: string;
  apiKey: string;
};

/** Resposta esperada de um endpoint de oportunidades/deals (lista). */
export type PipeRunDealRaw = Record<string, unknown> & {
  id?: string | number | null;
  hash?: string | null;
  pipeline_name?: string | null;
  stage_name?: string | null;
  etapa?: string | null;
  funil?: string | null;
  value?: number | string | null;
  valor?: number | string | null;
  status?: string | null;
  created_date?: string | null;
  closed_date?: string | null;
  owner_email?: string | null;
  owner_name?: string | null;
  company_name?: string | null;
  title?: string | null;
  titulo?: string | null;
};

/** Resposta esperada de um endpoint de atividades (lista). */
export type PipeRunActivityRaw = Record<string, unknown> & {
  id?: string | number | null;
  opportunity_id?: string | null;
  linked_opportunity_hash?: string | null;
  type?: string | null;
  title?: string | null;
  titulo?: string | null;
  owner?: string | null;
  done_at?: string | null;
  start_at?: string | null;
  created_at?: string | null;
  company_name?: string | null;
  opportunity_title?: string | null;
};

/** Formato normalizado para upsert em opportunities (compatível com webhook). */
export type NormalizedOpportunityRow = {
  crm_hash: string;
  pipeline_name: string | null;
  stage_name: string | null;
  stage_timing_days: number | null;
  owner_email: string | null;
  owner_name: string | null;
  company_name: string | null;
  title: string | null;
  value: number | null;
  created_date: string | null;
  closed_date: string | null;
  status: 'open' | 'won' | 'lost';
  tags: string | null;
};

/** Formato normalizado para insert em activities (compatível com webhook). */
export type NormalizedActivityRow = {
  crm_activity_id: string | null;
  type: string | null;
  title: string | null;
  owner: string | null;
  start_at: string | null;
  due_at: string | null;
  done_at: string | null;
  created_at_crm: string | null;
  opportunity_id_crm: string | null;
  linked_opportunity_hash: string | null;
  company_name: string | null;
  opportunity_title: string | null;
  opportunity_owner_name: string | null;
};
