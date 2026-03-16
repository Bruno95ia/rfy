'use client';

import { useState, useEffect } from 'react';
import { trackScreen } from '@/lib/analytics/track';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Target, Plus, Loader2, FileDown } from 'lucide-react';

type Plan = { id: string; name: string; status: string; period_start: string | null; period_end: string | null; created_at: string };

interface PAIPClientProps {
  initialPlans: Plan[];
}

export function PAIPClient({ initialPlans }: PAIPClientProps) {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    trackScreen('supho_paip');
  }, []);

  const createPlan = async () => {
    const name = newName.trim() || 'Plano PAIP';
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/supho/paip/plans', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao criar plano');
      setPlans((prev) => [data, ...prev]);
      setNewName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">{error}</div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" />
            Planos PAIP
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Nome do plano (ex.: 90 dias pós-diagnóstico)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            <Button onClick={createPlan} disabled={creating} size="sm">
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Novo plano
            </Button>
          </div>
          <ul className="space-y-2">
            {plans.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3"
              >
                <div>
                  <span className="font-medium text-slate-900">{p.name}</span>
                  <Badge variant="default" className="ml-2 text-xs">
                    {p.status}
                  </Badge>
                  {(p.period_start || p.period_end) && (
                    <span className="ml-2 text-xs text-slate-500">
                      {p.period_start ?? '—'} a {p.period_end ?? '—'}
                    </span>
                  )}
                </div>
                <a
                  href={`/api/supho/paip/plans/${p.id}/export`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:underline"
                >
                  <FileDown className="h-4 w-4" /> Exportar
                </a>
              </li>
            ))}
          </ul>
          {plans.length === 0 && (
            <p className="text-sm text-slate-500">
              Crie um plano para priorizar gaps do diagnóstico, definir OKRs/KPIs e vincular KRs ao CRM (Dashboard/Relatórios).
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
