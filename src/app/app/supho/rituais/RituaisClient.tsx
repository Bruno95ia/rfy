'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, CheckCircle2, Loader2, Gauge, ListTodo } from 'lucide-react';

type Template = { id: string; type: string; cadence: string; default_agenda: string };
type Ritual = {
  id: string;
  template_id: string;
  scheduled_at: string;
  conducted_at: string | null;
  notes: string | null;
  created_at: string;
  template?: Template;
};
type Decision = { id: string; decision_text: string | null; action_text: string | null; status: string; due_at: string | null };
type Score = { score: number; assiduidade_pct: number; execucao_pct: number; total_rituais: number; realizados: number; total_decisoes: number; decisoes_concluidas: number };

const TYPE_LABELS: Record<string, string> = {
  checkin_weekly: 'Check-in semanal',
  performance_biweekly: 'Performance quinzenal',
  feedback_monthly: 'Feedback mensal',
  governance_quarterly: 'Governança trimestral',
};

export function RituaisClient() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [rituals, setRituals] = useState<Ritual[]>([]);
  const [score, setScore] = useState<Score | null>(null);
  const [loading, setLoading] = useState(true);
  const [newRitualTemplateId, setNewRitualTemplateId] = useState('');
  const [newRitualScheduledAt, setNewRitualScheduledAt] = useState('');
  const [expandedRitualId, setExpandedRitualId] = useState<string | null>(null);
  const [decisions, setDecisions] = useState<Record<string, Decision[]>>({});
  const [conductingId, setConductingId] = useState<string | null>(null);
  const [newDecisionRitualId, setNewDecisionRitualId] = useState<string | null>(null);
  const [newDecisionText, setNewDecisionText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tRes, rRes, sRes] = await Promise.all([
        fetch('/api/supho/rituals/templates'),
        fetch('/api/supho/rituals'),
        fetch('/api/supho/rituals/score'),
      ]);
      if (tRes.ok) setTemplates((await tRes.json()) ?? []);
      if (rRes.ok) setRituals((await rRes.json()) ?? []);
      if (sRes.ok) setScore((await sRes.json()) ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadDecisions = useCallback(async (ritualId: string) => {
    const res = await fetch(`/api/supho/rituals/${ritualId}/decisions`);
    if (res.ok) {
      const list = await res.json();
      setDecisions((prev) => ({ ...prev, [ritualId]: list }));
    }
  }, []);

  const handleCreateRitual = async () => {
    if (!newRitualTemplateId || !newRitualScheduledAt) return;
    const res = await fetch('/api/supho/rituals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template_id: newRitualTemplateId, scheduled_at: newRitualScheduledAt }),
    });
    if (res.ok) {
      setNewRitualTemplateId('');
      setNewRitualScheduledAt('');
      load();
    }
  };

  const handleConduct = async (id: string) => {
    setConductingId(id);
    try {
      const res = await fetch(`/api/supho/rituals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conducted_at: new Date().toISOString() }),
      });
      if (res.ok) load();
    } finally {
      setConductingId(null);
    }
  };

  const handleAddDecision = async () => {
    if (!newDecisionRitualId || !newDecisionText.trim()) return;
    const res = await fetch(`/api/supho/rituals/${newDecisionRitualId}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decision_text: newDecisionText.trim(), action_text: newDecisionText.trim() }),
    });
    if (res.ok) {
      setNewDecisionText('');
      setNewDecisionRitualId(null);
      loadDecisions(newDecisionRitualId);
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  const ritualsByTemplate = templates.map((t) => ({
    template: t,
    rituals: rituals.filter((r) => r.template_id === t.id),
  }));

  return (
    <div className="space-y-6">
      {score != null && (
        <Card className="border-[var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Gauge className="h-5 w-5 text-[var(--color-primary)]" />
              Índice de Ritmo SUPHO
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-6">
            <div>
              <p className="text-3xl font-bold text-[var(--color-text)]">{score.score}</p>
              <p className="text-xs text-[var(--color-text-muted)]">0–100</p>
            </div>
            <div className="text-sm text-[var(--color-text-muted)]">
              <p>Assiduidade: {score.realizados}/{score.total_rituais} rituais realizados ({score.assiduidade_pct}%)</p>
              <p>Execução: {score.decisoes_concluidas}/{score.total_decisoes} decisões concluídas ({score.execucao_pct}%)</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="space-y-4">
        <p className="text-sm font-medium text-[var(--color-text)]">Nova ocorrência</p>
        <div className="flex flex-wrap items-end gap-2">
          <select
            className="flex h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            value={newRitualTemplateId}
            onChange={(e) => setNewRitualTemplateId(e.target.value)}
          >
            <option value="">Tipo</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{TYPE_LABELS[t.type] ?? t.type}</option>
            ))}
          </select>
          <Input
            type="datetime-local"
            value={newRitualScheduledAt}
            onChange={(e) => setNewRitualScheduledAt(e.target.value)}
            className="w-48"
          />
          <Button size="sm" onClick={handleCreateRitual} disabled={!newRitualTemplateId || !newRitualScheduledAt}>
            <Plus className="h-4 w-4 mr-1" />
            Agendar
          </Button>
        </div>
      </div>

      {ritualsByTemplate.map(({ template, rituals: list }) => (
        <Card key={template.id} className="border-[var(--color-border)]">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{TYPE_LABELS[template.type] ?? template.type}</CardTitle>
            <p className="text-xs text-[var(--color-text-muted)]">{template.cadence}</p>
          </CardHeader>
          <CardContent>
            {list.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)]">Nenhuma ocorrência ainda.</p>
            ) : (
              <ul className="space-y-2">
                {list.map((r) => (
                  <li
                    key={r.id}
                    className="flex flex-wrap items-center gap-2 rounded-lg border border-[var(--color-border)] p-3"
                  >
                    <Calendar className="h-4 w-4 text-[var(--color-text-muted)]" />
                    <span className="text-sm">
                      {new Date(r.scheduled_at).toLocaleString('pt-BR')}
                      {r.conducted_at && (
                        <>
                          {' · '}
                          <Badge variant="success" className="text-xs">Realizado</Badge>
                          {' '}
                          {new Date(r.conducted_at).toLocaleString('pt-BR')}
                        </>
                      )}
                    </span>
                    {!r.conducted_at && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleConduct(r.id)}
                        disabled={conductingId === r.id}
                      >
                        {conductingId === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle2 className="h-3 w-3" />}
                        Registrar realização
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setExpandedRitualId(expandedRitualId === r.id ? null : r.id);
                        if (expandedRitualId !== r.id) loadDecisions(r.id);
                      }}
                    >
                      <ListTodo className="h-3 w-3" /> Decisões
                    </Button>
                    {expandedRitualId === r.id && (
                      <div className="w-full mt-2 pl-6 space-y-2">
                        {(decisions[r.id] ?? []).map((d) => (
                          <div key={d.id} className="text-sm flex items-center gap-2">
                            <span className={d.status === 'done' ? 'line-through text-slate-500' : ''}>{d.decision_text || d.action_text || '—'}</span>
                            <Badge variant={d.status === 'done' ? 'success' : 'default'}>{d.status}</Badge>
                          </div>
                        ))}
                        {newDecisionRitualId === r.id ? (
                          <div className="flex gap-2">
                            <Input
                              placeholder="Decisão / ação"
                              value={newDecisionText}
                              onChange={(e) => setNewDecisionText(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && handleAddDecision()}
                            />
                            <Button size="sm" onClick={handleAddDecision}>Adicionar</Button>
                            <Button size="sm" variant="ghost" onClick={() => { setNewDecisionRitualId(null); setNewDecisionText(''); }}>Cancelar</Button>
                          </div>
                        ) : (
                          <Button size="sm" variant="outline" onClick={() => setNewDecisionRitualId(r.id)}>
                            <Plus className="h-3 w-3 mr-1" /> Nova decisão
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
