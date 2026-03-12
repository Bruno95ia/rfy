/**
 * Lógica compartilhada de processamento de upload (CSV → DB).
 * Usado pelos jobs Inngest e pelo fallback síncrono quando Inngest não está disponível.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { parsePiperunCsv } from '@/lib/piperun/csv';
import { normalizeOpportunityRow, normalizeActivityRow } from '@/lib/piperun/normalize';

export async function processOpportunitiesCsv(
  admin: SupabaseClient,
  orgId: string,
  uploadId: string,
  csvBody: string
): Promise<{ inserted: number }> {
  const rows = parsePiperunCsv(csvBody);
  if (rows.length < 2) throw new Error('CSV de oportunidades vazio ou sem dados');

  const headers = rows[0];
  const records = rows.slice(1);
  const toInsert: Array<{
    org_id: string;
    upload_id: string;
    crm_source: string;
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
  }> = [];

  for (const record of records) {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = record[i] ?? '';
    });
    const norm = normalizeOpportunityRow(row, headers);
    if (norm) {
      toInsert.push({
        org_id: orgId,
        upload_id: uploadId,
        crm_source: 'piperun',
        crm_hash: norm.crm_hash,
        pipeline_name: norm.pipeline_name,
        stage_name: norm.stage_name,
        stage_timing_days: norm.stage_timing_days,
        owner_email: norm.owner_email,
        owner_name: norm.owner_name,
        company_name: norm.company_name,
        title: norm.title,
        value: norm.value,
        created_date: norm.created_date,
        closed_date: norm.closed_date,
        status: norm.status,
        tags: norm.tags,
      });
    }
  }

  if (toInsert.length > 0) {
    await admin.from('opportunities').delete().eq('upload_id', uploadId);
    await admin.from('opportunities').insert(toInsert);
  }

  await admin
    .from('uploads')
    .update({
      status: 'done',
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', uploadId);

  return { inserted: toInsert.length };
}

export async function processActivitiesCsv(
  admin: SupabaseClient,
  orgId: string,
  uploadId: string,
  csvBody: string
): Promise<{ inserted: number }> {
  const rows = parsePiperunCsv(csvBody);
  if (rows.length < 2) throw new Error('CSV de atividades vazio ou sem dados');

  const headers = rows[0];
  const records = rows.slice(1);
  const toInsert: Array<{
    org_id: string;
    upload_id: string;
    crm_activity_id: string | null;
    type: string | null;
    title: string | null;
    owner: string | null;
    start_at: string | null;
    due_at: string | null;
    done_at: string | null;
    created_at_crm: string | null;
    status: string | null;
    opportunity_id_crm: string | null;
    pipeline_name: string | null;
    stage_name: string | null;
    company_name: string | null;
    opportunity_title: string | null;
    opportunity_owner_name: string | null;
  }> = [];

  for (const record of records) {
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = record[i] ?? '';
    });
    const norm = normalizeActivityRow(row, headers);
    if (norm) {
      toInsert.push({
        org_id: orgId,
        upload_id: uploadId,
        crm_activity_id: norm.crm_activity_id,
        type: norm.type,
        title: norm.title,
        owner: norm.owner,
        start_at: norm.start_at,
        due_at: norm.due_at,
        done_at: norm.done_at,
        created_at_crm: norm.created_at_crm,
        status: norm.status,
        opportunity_id_crm: norm.opportunity_id_crm,
        pipeline_name: norm.pipeline_name,
        stage_name: norm.stage_name,
        company_name: norm.company_name,
        opportunity_title: norm.opportunity_title,
        opportunity_owner_name: norm.opportunity_owner_name,
      });
    }
  }

  if (toInsert.length > 0) {
    await admin.from('activities').delete().eq('upload_id', uploadId);
    await admin.from('activities').insert(toInsert);
  }

  await admin
    .from('uploads')
    .update({
      status: 'done',
      processed_at: new Date().toISOString(),
      error_message: null,
    })
    .eq('id', uploadId);

  return { inserted: toInsert.length };
}

/** Vincula atividades ao pipeline (company + title + pipeline) e retorna quantas foram vinculadas. */
export async function linkActivitiesToOpportunities(
  admin: SupabaseClient,
  orgId: string,
  uploadId: string
): Promise<{ linked: number }> {
  const { data: activities } = await admin
    .from('activities')
    .select('id, company_name, opportunity_title, pipeline_name, created_at_crm')
    .eq('org_id', orgId)
    .eq('upload_id', uploadId);

  if (!activities?.length) return { linked: 0 };

  const { data: opportunities } = await admin
    .from('opportunities')
    .select('id, crm_hash, company_name, title, pipeline_name, created_date')
    .eq('org_id', orgId);

  const oppByKey = new Map<
    string,
    Array<{
      id: string;
      crm_hash: string;
      company_name: string | null;
      title: string | null;
      pipeline_name: string | null;
      created_date: string | null;
    }>
  >();

  for (const o of opportunities ?? []) {
    const key = `${(o.company_name ?? '').trim()}|${(o.title ?? '').trim()}|${(o.pipeline_name ?? '').trim()}`;
    if (!oppByKey.has(key)) oppByKey.set(key, []);
    oppByKey.get(key)!.push({
      id: o.id,
      crm_hash: o.crm_hash,
      company_name: o.company_name,
      title: o.title,
      pipeline_name: o.pipeline_name,
      created_date: o.created_date,
    });
  }

  let linked = 0;
  for (const a of activities) {
    const company = (a.company_name ?? '').trim();
    const title = (a.opportunity_title ?? '').trim();
    const pipeline = (a.pipeline_name ?? '').trim();
    const key = `${company}|${title}|${pipeline}`;
    let candidates = oppByKey.get(key) ?? [];
    if (pipeline) {
      candidates = candidates.filter((c) => (c.pipeline_name ?? '').trim() === pipeline);
    }
    let linkedHash: string | null = null;
    let confidence: 'high' | 'medium' | 'low' | 'none' = 'none';
    if (candidates.length === 1) {
      linkedHash = candidates[0]!.crm_hash;
      confidence = 'high';
    } else if (candidates.length > 1) {
      const actCreated = a.created_at_crm;
      const sorted = [...candidates].sort((x, y) => {
        const dx = x.created_date ? new Date(x.created_date).getTime() : 0;
        const dy = y.created_date ? new Date(y.created_date).getTime() : 0;
        const actTime = actCreated ? new Date(actCreated).getTime() : 0;
        return Math.abs(dx - actTime) - Math.abs(dy - actTime);
      });
      linkedHash = sorted[0]!.crm_hash;
      confidence = 'medium';
    }
    if (confidence !== 'none' && linkedHash) {
      await admin
        .from('activities')
        .update({ linked_opportunity_hash: linkedHash, link_confidence: confidence })
        .eq('id', a.id);
      linked++;
    }
  }
  return { linked };
}
