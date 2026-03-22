'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ClipboardList, Download, FileJson, FileSpreadsheet } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { UsageLimitsHint, useUploadLimitGate } from './UsageLimitsHint';

type Campaign = { id: string; name: string; status: string };

interface Props {
  orgId: string;
}

export function SuphoExternalImportForm({ orgId }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignId, setCampaignId] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingList, setLoadingList] = useState(true);
  const { blocked: uploadBlocked, refresh: refreshLimits } = useUploadLimitGate(1);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/supho/campaigns');
        if (!res.ok) throw new Error('Falha ao listar campanhas');
        const data = (await res.json()) as Campaign[];
        if (!cancelled) {
          setCampaigns(Array.isArray(data) ? data : []);
          if (data?.[0]?.id) setCampaignId(data[0].id);
        }
      } catch {
        if (!cancelled) setCampaigns([]);
      } finally {
        if (!cancelled) setLoadingList(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const input = (e.currentTarget.elements.namedItem('file') as HTMLInputElement | null)?.files?.[0];
    if (!input) {
      toast({ title: 'Selecione um arquivo', variant: 'destructive' });
      return;
    }
    if (!campaignId) {
      toast({ title: 'Selecione uma campanha SUPHO', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('file', input);
    formData.append('campaign_id', campaignId);
    formData.append('orgId', orgId);

    try {
      const res = await fetch('/api/supho/import-responses', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'Erro na importação');
      }
      toast({
        title: 'Importação concluída',
        description: `${data.respondents ?? 0} respondente(s), ${data.answer_rows ?? 0} resposta(s).`,
        variant: 'success',
      });
      (e.currentTarget.elements.namedItem('file') as HTMLInputElement).value = '';
      refreshLimits();
      router.refresh();
    } catch (err) {
      toast({
        title: 'Falha na importação',
        description: err instanceof Error ? err.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <UsageLimitsHint />
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1.5 flex-1 min-w-0">
          <label className="text-sm font-medium text-slate-900" htmlFor="supho-campaign">
            Campanha de diagnóstico SUPHO
          </label>
          <select
            id="supho-campaign"
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            disabled={loadingList || campaigns.length === 0}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
          >
            {campaigns.length === 0 && <option value="">Nenhuma campanha — crie em SUPHO</option>}
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            As respostas serão associadas a esta campanha. Perguntas devem ser UUIDs válidos da sua base SUPHO.
          </p>
        </div>
        <Button variant="outline" size="sm" className="shrink-0 gap-2" asChild>
          <a href="/api/supho/import-responses" download="modelo-supho-import.csv">
            <Download className="h-4 w-4" />
            Modelo CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
          CSV longo: respondent, question_id, value
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <FileJson className="h-4 w-4 text-indigo-500" />
          JSON: campaign_id + responses[]
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <ClipboardList className="h-4 w-4 text-indigo-500" />
          Valores Likert 1–5 por pergunta
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="primary" className="gap-1.5">
          <ClipboardList className="h-3.5 w-3.5" />
          SUPHO externo
        </Badge>
        <span className="text-xs text-slate-500">
          Use <code className="rounded bg-slate-100 px-1">external_id</code> no CSV para distinguir respondentes com o mesmo nome.
        </span>
      </div>

      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-6">
        <input
          name="file"
          type="file"
          accept=".csv,.json,text/csv,application/json"
          disabled={loading || uploadBlocked}
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100 disabled:opacity-50"
        />
        <p className="mt-3 text-xs text-slate-500">
          Exporte de Typeform, Google Forms ou outra ferramenta e ajuste colunas para o modelo. Perguntas:{' '}
          <a href="/api/supho/questions" className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer">
            /api/supho/questions
          </a>
          .
        </p>
      </div>

      <Button type="submit" disabled={loading || !campaignId || uploadBlocked} className="w-full sm:w-auto">
        {loading ? 'Importando…' : 'Importar respostas'}
      </Button>
    </form>
  );
}
