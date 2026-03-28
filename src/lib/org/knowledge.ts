/**
 * Repositório Conhecimento: arquivos da organização (e por campanha) agregados ao contexto do diagnóstico SUPHO.
 */
import type { AdminDbClientType } from '@/lib/supabase/admin';
import { getKnowledgeBuffer } from '@/lib/storage';
import {
  extractPlainTextFromBuffer,
  MAX_EXTRACT_INPUT_BYTES,
} from '@/lib/org/knowledge-extract';

/** Snapshot do arquivo de importação SUPHO — fica no repositório para auditoria, mas não entra no texto do diagnóstico. */
export const KNOWLEDGE_LABEL_SUPHO_IMPORT = 'supho_import';

export type OrgKnowledgeFileRow = {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  campaign_id: string | null;
  label: string | null;
};

function includeInDiagnosticContext(row: OrgKnowledgeFileRow): boolean {
  return row.label !== KNOWLEDGE_LABEL_SUPHO_IMPORT;
}

function safeFileSegment(name: string): string {
  const base = name.replace(/[/\\]/g, '_').replace(/[^a-zA-Z0-9._\s-]/g, '_');
  return base.slice(0, 200) || 'file';
}

const TEXT_LIKE = /^(text\/|application\/(json|xml|x-www-form-urlencoded)|message\/)/;
const EXT_TEXT = /\.(txt|md|markdown|csv|json|xml|html?|log|ts|tsx|js|jsx|css|yml|yaml)$/i;

function isProbablyText(mime: string | null, filename: string): boolean {
  if (mime && TEXT_LIKE.test(mime)) return true;
  return EXT_TEXT.test(filename);
}

const MAX_EXCERPT_PER_FILE = 12_000;

function truncateDiagnosticExcerpt(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '[Conteúdo vazio.]';
  if (trimmed.length <= MAX_EXCERPT_PER_FILE) return trimmed;
  return `${trimmed.slice(0, MAX_EXCERPT_PER_FILE)}\n\n[… truncado para o diagnóstico.]`;
}

/** Lê trecho textual para inclusão no bundle; PDF/DOCX/Excel extraem texto; outros binários viram aviso. */
export async function excerptForKnowledgeFile(
  storagePath: string,
  filename: string,
  mimeType: string | null,
  sizeBytes: number | null
): Promise<string> {
  try {
    const buf = await getKnowledgeBuffer(storagePath);
    if (buf.length > MAX_EXTRACT_INPUT_BYTES) {
      const sz = sizeBytes != null ? `${Math.round(sizeBytes / 1024)} KB` : 'tamanho desconhecido';
      return `[Arquivo acima do limite de extração (${Math.round(MAX_EXTRACT_INPUT_BYTES / (1024 * 1024))} MB): ~${sz}. Reduza o tamanho ou converta para texto.]`;
    }

    if (isProbablyText(mimeType, filename)) {
      const text = buf.toString('utf-8');
      return truncateDiagnosticExcerpt(text);
    }

    const extracted = await extractPlainTextFromBuffer(buf, mimeType, filename);
    if (extracted.ok) {
      return truncateDiagnosticExcerpt(extracted.text);
    }

    const sz = sizeBytes != null ? `${Math.round(sizeBytes / 1024)} KB` : 'tamanho desconhecido';
    return `[Não foi possível extrair texto legível (${mimeType ?? 'tipo desconhecido'}, ~${sz}). PDF digitalizado/imagem, protegido ou formato não suportado — use texto ou exporte para PDF com camada de texto.]`;
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
    .select('id, filename, storage_path, mime_type, size_bytes, campaign_id, label')
    .eq('org_id', orgId)
    .is('campaign_id', null);
  if (e1) {
    console.warn('[knowledge] list global:', e1.message);
  }
  const { data: campRows, error: e2 } = await admin
    .from('org_knowledge_files')
    .select('id, filename, storage_path, mime_type, size_bytes, campaign_id, label')
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

export type KnowledgeFileUsedInDiagnostic = {
  id: string;
  filename: string;
  scope: 'organização' | 'campanha';
};

/** Anexa seção "Conhecimento" ao bundle de contexto já montado a partir dos markdowns. */
export async function appendKnowledgeFilesToBundle(
  admin: AdminDbClientType,
  orgId: string,
  campaignId: string,
  baseBundle: string
): Promise<{ bundle: string; knowledgeFilesUsed: KnowledgeFileUsedInDiagnostic[] }> {
  const files = await fetchKnowledgeFilesForCampaign(admin, orgId, campaignId);
  const forDiagnostic = files.filter(includeInDiagnosticContext);
  if (forDiagnostic.length === 0) {
    return { bundle: baseBundle, knowledgeFilesUsed: [] };
  }

  const knowledgeFilesUsed: KnowledgeFileUsedInDiagnostic[] = [];
  const parts: string[] = [];
  for (const f of forDiagnostic) {
    const scope = f.campaign_id ? ('campanha' as const) : ('organização' as const);
    knowledgeFilesUsed.push({ id: f.id, filename: f.filename, scope });
    const excerpt = await excerptForKnowledgeFile(f.storage_path, f.filename, f.mime_type, f.size_bytes);
    parts.push(`### ${f.filename} (${scope})\n\n${excerpt}`);
  }

  const knowledgeBlock = ['## Repositório Conhecimento (documentos)', '', ...parts].join('\n\n');
  const base = baseBundle.trim();
  const bundle = !base ? knowledgeBlock : `${base}\n\n---\n\n${knowledgeBlock}`;
  return { bundle, knowledgeFilesUsed };
}

/**
 * Guarda cópia do arquivo de importação SUPHO no Storage + `org_knowledge_files` (label `supho_import`).
 * Não entra no texto do diagnóstico; serve de auditoria e rastreabilidade junto às respostas importadas.
 */
export async function persistSuphoImportKnowledgeSnapshot(
  admin: AdminDbClientType,
  args: {
    orgId: string;
    campaignId: string;
    userId: string;
    buf: Buffer;
    filename: string;
    mimeType: string;
    sizeBytes: number;
  }
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const originalName = args.filename || 'import';
  const safeName = safeFileSegment(originalName);
  const storagePath = `knowledge/${args.orgId}/imports/${args.campaignId}/${Date.now()}-${safeName}`;
  const mime = args.mimeType || 'application/octet-stream';

  const { error: upErr } = await admin.storage.from('knowledge').upload(storagePath, args.buf, {
    contentType: mime,
    upsert: false,
  });
  if (upErr) {
    return { ok: false, error: upErr.message };
  }

  const ins = await admin
    .from('org_knowledge_files')
    .insert({
      org_id: args.orgId,
      campaign_id: args.campaignId,
      filename: originalName,
      storage_path: storagePath,
      mime_type: mime,
      size_bytes: args.sizeBytes,
      created_by_user_id: args.userId,
      label: KNOWLEDGE_LABEL_SUPHO_IMPORT,
    })
    .select('id')
    .single();

  const insTyped = ins as { data: { id: string } | null; error: { message: string } | null };
  if (insTyped.error || !insTyped.data) {
    await admin.storage.from('knowledge').remove([storagePath]);
    return { ok: false, error: insTyped.error?.message ?? 'Falha ao registrar arquivo de importação' };
  }

  return { ok: true, id: insTyped.data.id };
}
