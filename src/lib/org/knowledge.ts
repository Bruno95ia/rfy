/**
 * Repositório Conhecimento: arquivos da organização (e por campanha) agregados ao contexto do diagnóstico SUPHO.
 */
import type { AdminDbClientType } from '@/lib/supabase/admin';
import { getKnowledgeBuffer } from '@/lib/storage';

export type OrgKnowledgeFileRow = {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  campaign_id: string | null;
};

const TEXT_LIKE = /^(text\/|application\/(json|xml|x-www-form-urlencoded)|message\/)/;
const EXT_TEXT = /\.(txt|md|markdown|csv|json|xml|html?|log|ts|tsx|js|jsx|css|yml|yaml)$/i;

function isProbablyText(mime: string | null, filename: string): boolean {
  if (mime && TEXT_LIKE.test(mime)) return true;
  return EXT_TEXT.test(filename);
}

const MAX_EXCERPT_PER_FILE = 12_000;

/** Lê trecho textual para inclusão no bundle; binários viram descrição curta. */
export async function excerptForKnowledgeFile(
  storagePath: string,
  filename: string,
  mimeType: string | null,
  sizeBytes: number | null
): Promise<string> {
  if (!isProbablyText(mimeType, filename)) {
    const sz = sizeBytes != null ? `${Math.round(sizeBytes / 1024)} KB` : 'tamanho desconhecido';
    return `[Arquivo binário ou não textual: ${mimeType ?? 'tipo desconhecido'}, ~${sz}. Conteúdo não incorporado ao texto do diagnóstico.]`;
  }
  try {
    const buf = await getKnowledgeBuffer(storagePath);
    const text = buf.toString('utf-8');
    const trimmed = text.trim();
    if (!trimmed) return '[Arquivo vazio.]';
    if (trimmed.length <= MAX_EXCERPT_PER_FILE) return trimmed;
    return `${trimmed.slice(0, MAX_EXCERPT_PER_FILE)}\n\n[… truncado para o diagnóstico.]`;
  } catch {
    return '[Não foi possível ler o arquivo.]';
  }
}

/**
 * Lista arquivos aplicáveis à campanha: globais da org (campaign_id IS NULL) + específicos da campanha.
 */
export async function fetchKnowledgeFilesForCampaign(
  admin: AdminDbClientType,
  orgId: string,
  campaignId: string
): Promise<OrgKnowledgeFileRow[]> {
  const { data: globalRows, error: e1 } = await admin
    .from('org_knowledge_files')
    .select('id, filename, storage_path, mime_type, size_bytes, campaign_id')
    .eq('org_id', orgId)
    .is('campaign_id', null);
  if (e1) {
    console.warn('[knowledge] list global:', e1.message);
  }
  const { data: campRows, error: e2 } = await admin
    .from('org_knowledge_files')
    .select('id, filename, storage_path, mime_type, size_bytes, campaign_id')
    .eq('org_id', orgId)
    .eq('campaign_id', campaignId);
  if (e2) {
    console.warn('[knowledge] list campaign:', e2.message);
  }
  const map = new Map<string, OrgKnowledgeFileRow>();
  for (const r of [...(globalRows ?? []), ...(campRows ?? [])]) {
    const row = r as OrgKnowledgeFileRow;
    map.set(row.id, row);
  }
  return [...map.values()].sort((a, b) => a.filename.localeCompare(b.filename));
}

/** Anexa seção "Conhecimento" ao bundle de contexto já montado a partir dos markdowns. */
export async function appendKnowledgeFilesToBundle(
  admin: AdminDbClientType,
  orgId: string,
  campaignId: string,
  baseBundle: string
): Promise<string> {
  const files = await fetchKnowledgeFilesForCampaign(admin, orgId, campaignId);
  if (files.length === 0) return baseBundle;

  const parts: string[] = [];
  for (const f of files) {
    const scope = f.campaign_id ? 'campanha' : 'organização';
    const excerpt = await excerptForKnowledgeFile(f.storage_path, f.filename, f.mime_type, f.size_bytes);
    parts.push(`### ${f.filename} (${scope})\n\n${excerpt}`);
  }

  const knowledgeBlock = ['## Repositório Conhecimento (documentos)', '', ...parts].join('\n\n');
  const base = baseBundle.trim();
  if (!base) return knowledgeBlock;
  return `${base}\n\n---\n\n${knowledgeBlock}`;
}
