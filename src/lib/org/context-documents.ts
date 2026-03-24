/**
 * Documentos de contexto organizacional (alimentam o diagnóstico SUPHO).
 * Chaves alinhadas a docs/contexto-organizacao/*.md
 */

export const ORG_CONTEXT_DOCUMENT_DEFS = [
  {
    key: '01-identificacao',
    title: 'Identificação e contatos',
    hint: 'Nome comercial, segmento, site, sponsor do projeto RFY, e-mails para alertas, horário comercial.',
  },
  {
    key: '02-config-operacional',
    title: 'Configuração operacional e alertas',
    hint: 'Limiares em dias (proposta em risco, pipeline abandonado), fuso horário, como a equipe usa notificações.',
  },
  {
    key: '03-integracao-crm',
    title: 'Integração CRM',
    hint: 'Provedor (PipeRun, HubSpot…), o que já está ligado ao RFY, mapeamento de campos, limitações conhecidas.',
  },
  {
    key: '04-processo-comercial',
    title: 'Processo comercial e glossário',
    hint: 'Etapas do funil, nomes usados na equipe (“cliente”, “oportunidade”), SLAs internos e exclusões.',
  },
  {
    key: '05-perfil-metricas',
    title: 'Perfil e métricas de referência',
    hint: 'Faixa de ticket e ciclo, nº de vendedores, KPIs que acompanham, metas do ano.',
  },
  {
    key: '06-governanca-rbac',
    title: 'Governança, RBAC e políticas',
    hint: 'Quem convida usuários, LGPD/retention, quem aprova mudanças em integrações ou exportações.',
  },
] as const;

export type OrgContextDocKey = (typeof ORG_CONTEXT_DOCUMENT_DEFS)[number]['key'];

export function titleForDocKey(key: string): string {
  return ORG_CONTEXT_DOCUMENT_DEFS.find((d) => d.key === key)?.title ?? key;
}

export type OrgContextDocRow = {
  doc_key: string;
  title: string | null;
  body_markdown: string;
  updated_at?: string;
};

/** Junta o texto de todos os documentos preenchidos para o modelo de diagnóstico. */
export function buildOrgContextBundleText(
  rows: Array<{ doc_key: string; body_markdown: string | null }>
): string {
  const byKey = new Map(rows.map((r) => [r.doc_key, (r.body_markdown ?? '').trim()]));
  const parts: string[] = [];
  for (const def of ORG_CONTEXT_DOCUMENT_DEFS) {
    const body = byKey.get(def.key);
    if (body && body.length > 0) {
      parts.push(`## ${def.title}\n\n${body}`);
    }
  }
  return parts.join('\n\n---\n\n');
}

const MAX_SUMMARY_CHARS = 12_000;

/** Trecho persistido em result_json para leitura no painel (limite por linha de JSON). */
export function truncateOrgContextForResultJson(bundle: string): string {
  const t = bundle.trim();
  if (t.length <= MAX_SUMMARY_CHARS) return t;
  return `${t.slice(0, MAX_SUMMARY_CHARS)}\n\n[… texto truncado para armazenamento; edição completa em Configurações → Contexto da organização.]`;
}
