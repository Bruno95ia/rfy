'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { trackScreen } from '@/lib/analytics/track';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Upload, Trash2, Library, FileText, Link2 } from 'lucide-react';

type KnowledgeRow = {
  id: string;
  filename: string;
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  campaign_id: string | null;
  label: string | null;
  created_at: string;
};

type CampaignOpt = { id: string; name: string };

function formatBytes(n: number | null): string {
  if (n == null || Number.isNaN(n)) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function FileListRow({
  f,
  scopeLabel,
  canEdit,
  onDelete,
}: {
  f: KnowledgeRow;
  scopeLabel: string;
  canEdit: boolean;
  onDelete: (id: string) => void;
}) {
  return (
    <li className="flex min-w-0 flex-col gap-2 border-b border-[var(--color-border)] px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium text-[var(--color-text)]">{f.filename}</p>
        <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">
          {f.mime_type ?? 'tipo desconhecido'} · {formatBytes(f.size_bytes)} ·{' '}
          {new Date(f.created_at).toLocaleString('pt-BR')}
        </p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:justify-start">
        <Badge variant="outline" className="text-xs">
          {scopeLabel}
        </Badge>
        {f.label === 'supho_import' && (
          <Badge variant="outline" className="text-xs">
            Importação SUPHO
          </Badge>
        )}
        {canEdit && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-9 w-9 shrink-0 p-0 text-red-600 hover:bg-red-50 hover:text-red-700"
            aria-label={`Excluir ${f.filename}`}
            onClick={() => void onDelete(f.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </li>
  );
}

export function ConhecimentoClient() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [globalFiles, setGlobalFiles] = useState<KnowledgeRow[]>([]);
  const [campaignFiles, setCampaignFiles] = useState<KnowledgeRow[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [campaigns, setCampaigns] = useState<CampaignOpt[]>([]);
  const [listCampaignId, setListCampaignId] = useState<string | null>(null);
  const [uploadTarget, setUploadTarget] = useState<'org' | string>('org');
  const [fileInputKey, setFileInputKey] = useState(0);

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/supho/campaigns');
      const data = await res.json().catch(() => []);
      if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`);
      const rows = Array.isArray(data) ? data : [];
      setCampaigns(rows.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name ?? 'Campanha' })));
    } catch {
      setCampaigns([]);
    }
  }, []);

  const loadFiles = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const q = listCampaignId ? `?campaign_id=${encodeURIComponent(listCampaignId)}` : '';
      const res = await fetch(`/api/org/knowledge${q}`);
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      setGlobalFiles((data.global ?? []) as KnowledgeRow[]);
      setCampaignFiles((data.campaign ?? []) as KnowledgeRow[]);
      setCanEdit(data.can_edit === true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar');
    } finally {
      setLoading(false);
    }
  }, [listCampaignId]);

  useEffect(() => {
    void loadCampaigns();
  }, [loadCampaigns]);

  useEffect(() => {
    void loadFiles();
  }, [loadFiles]);

  useEffect(() => {
    trackScreen('settings_conhecimento');
  }, []);

  const onUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem('file') as HTMLInputElement | null)?.files?.[0];
    if (!input) {
      toast({ title: 'Escolha um arquivo', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', input);
      if (uploadTarget !== 'org') {
        fd.append('campaign_id', uploadTarget);
      }
      const res = await fetch('/api/org/knowledge', { method: 'POST', body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast({ title: 'Arquivo enviado', description: (data.file as { filename?: string })?.filename ?? 'OK' });
      setFileInputKey((k) => k + 1);
      await loadFiles();
    } catch (err) {
      toast({
        title: 'Falha no envio',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const onDelete = async (id: string) => {
    if (!canEdit) return;
    if (!window.confirm('Excluir este arquivo do repositório?')) return;
    try {
      const res = await fetch(`/api/org/knowledge?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`);
      toast({ title: 'Arquivo removido' });
      await loadFiles();
    } catch (err) {
      toast({
        title: 'Não foi possível excluir',
        description: err instanceof Error ? err.message : 'Erro',
        variant: 'destructive',
      });
    }
  };

  const listCampaignName = listCampaignId
    ? campaigns.find((c) => c.id === listCampaignId)?.name ?? 'campanha'
    : null;

  return (
    <div className="w-full min-w-0 space-y-6">
      <div className="min-w-0 rounded-xl border border-indigo-200/70 bg-indigo-50/50 px-4 py-3 text-sm leading-relaxed text-indigo-950 dark:border-indigo-900/40 dark:bg-indigo-950/20 dark:text-indigo-100">
        <p className="flex min-w-0 gap-2">
          <FileText className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400" aria-hidden />
          <span className="min-w-0">
            Complementa o{' '}
            <Link
              href="/app/settings/contexto-organizacao"
              className="inline-flex items-center gap-1 font-medium text-indigo-800 underline-offset-2 hover:underline dark:text-indigo-300"
            >
              <Link2 className="h-3.5 w-3.5 shrink-0" />
              contexto em texto (Markdown)
            </Link>
            . Arquivos <strong>globais</strong> valem para todas as campanhas; arquivos por{' '}
            <strong>campanha</strong> restringem-se a essa campanha.
          </span>
        </p>
      </div>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="space-y-2 pb-2">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Upload className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
            Enviar documento
          </CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">
            Até 50 MB. Texto, Markdown, CSV, PDF (texto), DOCX e Excel (XLS/XLSX) têm o conteúdo extraído para o diagnóstico;
            PDF digitalizado ou formatos não suportados aparecem só como referência.
          </p>
        </CardHeader>
        <CardContent>
          {!canEdit && (
            <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/80 px-3 py-2 text-sm text-amber-950 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
              Apenas proprietários, administradores ou gestores podem enviar ou excluir arquivos.
            </p>
          )}
          <form onSubmit={onUpload} className="min-w-0 space-y-4">
            <label className="block min-w-0 text-[var(--color-text)]">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Arquivo
              </span>
              <input
                key={fileInputKey}
                name="file"
                type="file"
                disabled={!canEdit || uploading}
                className="w-full min-w-0 max-w-full cursor-pointer rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 disabled:opacity-60 dark:file:bg-indigo-950/50 dark:file:text-indigo-200"
              />
            </label>

            <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
              <label className="block min-w-0 text-[var(--color-text)]">
                <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                  Onde guardar
                </span>
                <select
                  className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm disabled:opacity-60"
                  value={uploadTarget}
                  disabled={!canEdit || uploading}
                  onChange={(e) => {
                    const v = e.target.value;
                    setUploadTarget(v === 'org' ? 'org' : v);
                  }}
                >
                  <option value="org">Toda a organização</option>
                  {campaigns.map((c) => (
                    <option key={c.id} value={c.id}>
                      Só esta campanha: {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="submit"
                disabled={!canEdit || uploading}
                className="w-full shrink-0 sm:w-auto sm:min-w-[8.5rem]"
              >
                {uploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando…
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Enviar
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)] bg-[var(--color-surface)]">
        <CardHeader className="space-y-2 border-b border-[var(--color-border)] pb-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Library className="h-5 w-5 shrink-0 text-[var(--color-primary)]" />
                Repositório
              </CardTitle>
              <p className="mt-1 break-words text-sm text-[var(--color-text-muted)]">
                {listCampaignId
                  ? `Mostrando globais + arquivos de «${listCampaignName}».`
                  : 'Mostrando apenas arquivos globais da organização.'}
              </p>
            </div>
            <label className="w-full shrink-0 lg:w-72 lg:max-w-none">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                Vista por campanha
              </span>
              <select
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2.5 text-sm"
                value={listCampaignId ?? ''}
                onChange={(e) => {
                  const v = e.target.value.trim();
                  setListCampaignId(v || null);
                }}
              >
                <option value="">Só globais (organização)</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    Globais + {c.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          {loading && (
            <div className="flex items-center gap-2 py-8 text-sm text-[var(--color-text-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando…
            </div>
          )}
          {error && (
            <p className="py-4 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          {!loading && !error && (
            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                  Organização (todas as campanhas)
                </h3>
                {globalFiles.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                    Nenhum arquivo global ainda.
                  </p>
                ) : (
                  <ul className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                    {globalFiles.map((f) => (
                      <FileListRow
                        key={f.id}
                        f={f}
                        scopeLabel="Global"
                        canEdit={canEdit}
                        onDelete={onDelete}
                      />
                    ))}
                  </ul>
                )}
              </div>

              {listCampaignId && (
                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
                    {listCampaignName ? `Campanha: ${listCampaignName}` : 'Campanha'}
                  </h3>
                  {campaignFiles.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/40 px-4 py-6 text-center text-sm text-[var(--color-text-muted)]">
                      Nenhum arquivo específico desta campanha.
                    </p>
                  ) : (
                    <ul className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
                      {campaignFiles.map((f) => (
                        <FileListRow
                          key={f.id}
                          f={f}
                          scopeLabel="Campanha"
                          canEdit={canEdit}
                          onDelete={onDelete}
                        />
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
