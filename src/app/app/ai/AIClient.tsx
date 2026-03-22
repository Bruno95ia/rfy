'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, BarChart3, Briefcase, Lightbulb, AlertCircle } from 'lucide-react';
import { getAIStatus, type AIStatusResponse } from '@/lib/aiClient';

export function AIClient({ orgId }: { orgId: string }) {
  const [benchmarkLoading, setBenchmarkLoading] = useState(false);
  const [benchmark, setBenchmark] = useState<Record<string, unknown> | null>(null);
  const [dealId, setDealId] = useState('');
  const [dealLoading, setDealLoading] = useState(false);
  const [dealResult, setDealResult] = useState<Record<string, unknown> | null>(null);
  const [interventionsLoading, setInterventionsLoading] = useState(false);
  const [interventions, setInterventions] = useState<unknown[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);
  const [aiStatusLoading, setAiStatusLoading] = useState(true);

  const loadAiAvailability = useCallback(async () => {
    if (!orgId) return;
    setAiStatusLoading(true);
    try {
      const data = await getAIStatus(orgId);
      setAiStatus(data);
    } catch {
      setAiStatus({
        health: 'unavailable',
        models: [],
        models_available: false,
        error: 'Não foi possível contactar o serviço de IA',
      });
    } finally {
      setAiStatusLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    void loadAiAvailability();
  }, [loadAiAvailability]);

  /** Alinhado a GET /api/ai/status: `health === 'ok'` quando o AI Service responde em condições. */
  const aiReady = aiStatus?.health === 'ok';

  const runBenchmark = async () => {
    if (!orgId) return;
    setBenchmarkLoading(true);
    setError(null);
    setBenchmark(null);
    try {
      const res = await fetch('/api/ai/benchmark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
      setBenchmark(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBenchmarkLoading(false);
    }
  };

  const runDeal = async () => {
    if (!orgId || !dealId.trim()) return;
    setDealLoading(true);
    setError(null);
    setDealResult(null);
    try {
      const res = await fetch('/api/ai/deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId, deal_id: dealId.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
      setDealResult(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setDealLoading(false);
    }
  };

  const runInterventions = async () => {
    if (!orgId) return;
    setInterventionsLoading(true);
    setError(null);
    setInterventions(null);
    try {
      const res = await fetch('/api/ai/interventions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
      setInterventions(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setInterventionsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {!aiStatusLoading && !aiReady && (
        <div
          className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950"
          role="status"
        >
          <div className="flex gap-2">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <div>
              <p className="font-medium">Análise AI indisponível</p>
              <p className="mt-1 text-amber-900/90">
                O serviço de IA (previsões, benchmark, intervenções) não está acessível ou não respondeu a tempo.
                Confirme que <code className="rounded bg-amber-100/80 px-1">AI_SERVICE_URL</code> aponta para o
                serviço correto e que o processo está em execução. Os restantes módulos do RFY não dependem disto.
              </p>
              {aiStatus?.error && (
                <p className="mt-2 font-mono text-xs text-amber-900/80">{aiStatus.error}</p>
              )}
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Card className="border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BarChart3 className="h-4 w-4" />
            Benchmark
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runBenchmark} disabled={benchmarkLoading || !orgId || !aiReady}>
            {benchmarkLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Executar benchmark
          </Button>
          {benchmark && (
            <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs overflow-auto max-h-64">
              {JSON.stringify(benchmark, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Briefcase className="h-4 w-4" />
            Deal (P(win), risco, fechamento)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Input
            placeholder="ID do deal"
            value={dealId}
            onChange={(e) => setDealId(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={runDeal} disabled={dealLoading || !orgId || !dealId.trim() || !aiReady}>
            {dealLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Analisar deal
          </Button>
          {dealResult && (
            <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs overflow-auto max-h-48">
              {JSON.stringify(dealResult, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Lightbulb className="h-4 w-4" />
            Intervenções sugeridas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={runInterventions} disabled={interventionsLoading || !orgId || !aiReady}>
            {interventionsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Carregar intervenções
          </Button>
          {interventions != null && (
            <pre className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs overflow-auto max-h-64">
              {JSON.stringify(interventions, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
