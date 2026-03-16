'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, TrendingUp } from 'lucide-react';

export function ForecastClient({ orgId }: { orgId: string }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    if (!orgId) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch('/api/ai/forecast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ org_id: orgId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `Erro ${res.status}`);
      setResult(data as Record<string, unknown>);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-[var(--color-border)]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-4 w-4 text-[var(--color-primary)]" />
          Previsão de receita (IA)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={run} disabled={loading || !orgId}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          Calcular previsão
        </Button>
        {error && <p className="text-sm text-red-600">{error}</p>}
        {result && (
          <pre className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
