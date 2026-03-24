'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { trackScreen } from '@/lib/analytics/track';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import {
  Loader2,
  Save,
  BookOpen,
  Link2,
  ChevronDown,
  FileText,
  Lock,
  Settings2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/cn';

type DocRow = {
  doc_key: string;
  title: string;
  hint?: string;
  body_markdown: string;
  updated_at: string | null;
};

export function ContextoOrganizacaoClient() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [erpStatus, setErpStatus] = useState<'unknown' | 'integrated' | 'not_integrated'>('unknown');
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [initialErp, setInitialErp] = useState<'unknown' | 'integrated' | 'not_integrated'>('unknown');
  const [initialBodies, setInitialBodies] = useState<Record<string, string>>({});
  const [canEdit, setCanEdit] = useState(true);
  const [crmActive, setCrmActive] = useState<boolean | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/org/context-documents');
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      const docs = (data.documents ?? []) as DocRow[];
      setDocuments(docs);
      setCanEdit(data.can_edit !== false);
      setCrmActive(typeof data.crm_integration_active === 'boolean' ? data.crm_integration_active : null);

      const erp =
        data.erp_integration_status === 'integrated' ||
        data.erp_integration_status === 'not_integrated' ||
        data.erp_integration_status === 'unknown'
          ? data.erp_integration_status
          : 'unknown';
      setErpStatus(erp);
      setInitialErp(erp);
      setInitialBodies(Object.fromEntries(docs.map((d) => [d.doc_key, d.body_markdown ?? ''])));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    trackScreen('settings_contexto_organizacao');
  }, []);

  const dirty = useMemo(() => {
    if (erpStatus !== initialErp) return true;
    return documents.some((d) => (d.body_markdown ?? '') !== (initialBodies[d.doc_key] ?? ''));
  }, [documents, erpStatus, initialErp, initialBodies]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!dirty || saving) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty, saving]);

  const save = async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const payload: {
        erp_integration_status?: 'unknown' | 'integrated' | 'not_integrated';
        documents?: Array<{ doc_key: string; body_markdown: string }>;
      } = {};

      if (erpStatus !== initialErp) {
        payload.erp_integration_status = erpStatus;
      }

      const changed = documents.filter(
        (d) => (d.body_markdown ?? '') !== (initialBodies[d.doc_key] ?? '')
      );
      if (changed.length > 0) {
        payload.documents = changed.map((d) => ({
          doc_key: d.doc_key,
          body_markdown: d.body_markdown ?? '',
        }));
      }

      if (Object.keys(payload).length === 0) {
        toast({ title: 'Nada alterado', description: 'Faça uma alteração antes de salvar.' });
        setSaving(false);
        return;
      }

      const docCount = changed.length;
      const erpChanged = erpStatus !== initialErp;

      const res = await fetch('/api/org/context-documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);

      await load();
      let description = 'Dados atualizados.';
      if (docCount > 0 && erpChanged) description = 'Documentos e situação de ERP atualizados.';
      else if (docCount > 0) description = `${docCount} secção(ões) de texto atualizada(s).`;
      else if (erpChanged) description = 'Situação de ERP atualizada.';
      toast({ title: 'Contexto guardado', description });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const updateBody = (key: string, body: string) => {
    setDocuments((prev) => prev.map((d) => (d.doc_key === key ? { ...d, body_markdown: body } : d)));
  };

  const filledCount = documents.filter((d) => (d.body_markdown ?? '').trim().length > 0).length;
  const totalChars = documents.reduce((acc, d) => acc + (d.body_markdown?.length ?? 0), 0);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--color-text-muted)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}

      {!canEdit && (
        <Card className="border-amber-200 bg-amber-50/80">
          <CardContent className="flex items-start gap-3 pt-6">
            <Lock className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div className="text-sm text-amber-950">
              <p className="font-medium">Visualização apenas</p>
              <p className="mt-1 text-amber-900/90">
                Apenas proprietário, administrador ou gestor pode editar o contexto. Peça a um admin para atualizar
                estes textos.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-text-muted)]">
        <Badge variant="default" className="font-normal">
          {filledCount}/{documents.length} secções com texto
        </Badge>
        <span className="tabular-nums">{totalChars.toLocaleString('pt-BR')} caracteres no total</span>
      </div>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-[var(--color-text)]">
            <Settings2 className="h-4 w-4 text-[var(--color-primary)]" />
            Sistemas e diagnóstico SUPHO
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-[var(--color-text-muted)]">
          <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            <p className="text-xs font-semibold uppercase text-[var(--color-text-muted)]">CRM no RFY</p>
            <p className="mt-2 text-[var(--color-text)]">
              {crmActive === null
                ? '—'
                : crmActive
                  ? 'Integração CRM ativa — o ajuste de imaturidade por ausência de CRM não se aplica.'
                  : 'Sem integração CRM ativa — o diagnóstico pode reduzir o índice IP (performance).'}
            </p>
            <Link
              href="/app/settings"
              className="mt-2 inline-flex items-center gap-1.5 text-sm text-[var(--color-primary)] hover:underline"
            >
              <Link2 className="h-3.5 w-3.5" />
              Configurar CRM em Configurações
            </Link>
          </div>

          <p>
            O RFY pode ajustar o índice de performance (IP) quando <strong>não há CRM ativo</strong> ou quando o ERP
            está declarado como <strong>não integrado</strong>. Em &quot;Não informado&quot; para ERP, nenhuma
            penalidade por ERP é aplicada.
          </p>
          <label className="block text-[var(--color-text)]">
            <span className="mb-1 block text-xs font-medium uppercase text-[var(--color-text-muted)]">
              Situação do ERP
            </span>
            <select
              className="mt-1 w-full max-w-xl rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm disabled:opacity-60"
              value={erpStatus}
              disabled={!canEdit}
              onChange={(e) =>
                setErpStatus(e.target.value as 'unknown' | 'integrated' | 'not_integrated')
              }
            >
              <option value="unknown">Não informado (sem penalidade por ERP)</option>
              <option value="integrated">ERP integrado ao processo (pedido / financeiro / estoque)</option>
              <option value="not_integrated">Sem integração de ERP (ou planilhas / sistemas isolados)</option>
            </select>
          </label>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center gap-2 text-base font-semibold text-[var(--color-text)]">
          <BookOpen className="h-4 w-4 text-[var(--color-primary)]" />
          Documentos de contexto
        </div>
        <p className="text-sm text-[var(--color-text-muted)]">
          Preencha as secções abaixo (Markdown livre). O conteúdo entra no cálculo do diagnóstico quando existir texto.
          Abra cada bloco para editar.
        </p>

        {documents.map((doc) => {
          const hasContent = (doc.body_markdown ?? '').trim().length > 0;
          return (
            <details
              key={doc.doc_key}
              className="group rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] open:shadow-[var(--shadow-sm)]"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left [&::-webkit-details-marker]:hidden">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <FileText className="h-4 w-4 shrink-0 text-[var(--color-primary)]" aria-hidden />
                  <span className="font-medium text-[var(--color-text)]">{doc.title}</span>
                  {hasContent ? (
                    <Badge variant="outline" className="shrink-0 text-xs font-normal">
                      {(doc.body_markdown?.length ?? 0).toLocaleString('pt-BR')} caracteres
                    </Badge>
                  ) : (
                    <Badge variant="default" className="shrink-0 text-xs">
                      Vazio
                    </Badge>
                  )}
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition group-open:rotate-180" />
              </summary>
              <div className="border-t border-[var(--color-border)] px-4 pb-4 pt-2">
                {doc.hint && (
                  <p className="mb-2 text-xs leading-relaxed text-[var(--color-text-muted)]">{doc.hint}</p>
                )}
                <p className="mb-2 text-xs text-[var(--color-text-muted)]">
                  <code className="rounded bg-[var(--color-surface-muted)] px-1">{doc.doc_key}</code>
                  {doc.updated_at && (
                    <> · Atualizado em {new Date(doc.updated_at).toLocaleString('pt-BR')}</>
                  )}
                </p>
                <textarea
                  className={cn(
                    'min-h-[160px] w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 font-mono text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]',
                    !canEdit && 'cursor-not-allowed opacity-70'
                  )}
                  value={doc.body_markdown}
                  disabled={!canEdit}
                  onChange={(e) => updateBody(doc.doc_key, e.target.value)}
                  placeholder={doc.hint ?? 'Escreva ou cole o conteúdo em Markdown…'}
                  aria-label={doc.title}
                />
              </div>
            </details>
          );
        })}
      </div>

      <div
        className={cn(
          'sticky bottom-4 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)]',
          dirty && canEdit && 'border-[var(--color-primary)]/30 ring-1 ring-[var(--color-primary)]/20'
        )}
      >
        <div className="text-sm text-[var(--color-text-muted)]">
          {dirty && canEdit ? (
            <span className="font-medium text-[var(--color-text)]">Alterações não guardadas</span>
          ) : (
            <span>Tudo sincronizado com o servidor</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/app/settings/context-pack"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Context Pack (ICP, pricing, roadmap)
          </Link>
          <Link
            href="/app/supho/maturidade"
            className="text-sm text-[var(--color-primary)] hover:underline"
          >
            Painel SUPHO
          </Link>
          <Button
            type="button"
            onClick={() => void save()}
            disabled={saving || !canEdit || !dirty}
            className="gap-2"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Guardar alterações
          </Button>
        </div>
      </div>
    </div>
  );
}
