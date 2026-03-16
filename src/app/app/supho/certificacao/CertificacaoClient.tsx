'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Award, Plus, FileText, Loader2, ExternalLink } from 'lucide-react';

type Run = { id: string; run_at: string; level: string; valid_until: string | null };
type Criterion = { id: string; dimension: string; criterion_text: string; max_score: number };
type Evidence = { id: string; criterion_id: string; score: number; evidence_url: string | null; notes: string | null };

const LEVEL_LABELS: Record<string, string> = { bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro' };

export function CertificacaoClient() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [evidencesByRun, setEvidencesByRun] = useState<Record<string, Evidence[]>>({});
  const [loading, setLoading] = useState(true);
  const [newLevel, setNewLevel] = useState('bronze');
  const [newValidUntil, setNewValidUntil] = useState('');
  const [expandedRunId, setExpandedRunId] = useState<string | null>(null);
  const [evidenceForm, setEvidenceForm] = useState<{ runId: string; criterion_id: string; score: number; evidence_url: string; notes: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rRes, cRes] = await Promise.all([
        fetch('/api/supho/certification/runs'),
        fetch('/api/supho/certification/criteria'),
      ]);
      if (rRes.ok) setRuns((await rRes.json()) ?? []);
      if (cRes.ok) setCriteria((await cRes.json()) ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadEvidences = useCallback(async (runId: string) => {
    const res = await fetch(`/api/supho/certification/runs/${runId}/evidences`);
    if (res.ok) setEvidencesByRun((prev) => ({ ...prev, [runId]: await res.json() }));
  }, []);

  const handleCreateRun = async () => {
    const res = await fetch('/api/supho/certification/runs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: newLevel, valid_until: newValidUntil || null }),
    });
    if (res.ok) {
      setNewValidUntil('');
      load();
    }
  };

  const handleSaveEvidence = async () => {
    if (!evidenceForm) return;
    const res = await fetch(`/api/supho/certification/runs/${evidenceForm.runId}/evidences`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        criterion_id: evidenceForm.criterion_id,
        score: evidenceForm.score,
        evidence_url: evidenceForm.evidence_url || null,
        notes: evidenceForm.notes || null,
      }),
    });
    if (res.ok) {
      setEvidenceForm(null);
      loadEvidences(evidenceForm.runId);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-[var(--color-border)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Novo run de certificação</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-2">
          <select
            className="flex h-10 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm"
            value={newLevel}
            onChange={(e) => setNewLevel(e.target.value)}
          >
            <option value="bronze">Bronze</option>
            <option value="prata">Prata</option>
            <option value="ouro">Ouro</option>
          </select>
          <Input
            type="date"
            placeholder="Válido até"
            value={newValidUntil}
            onChange={(e) => setNewValidUntil(e.target.value)}
            className="w-40"
          />
          <Button size="sm" onClick={handleCreateRun}>
            <Plus className="h-4 w-4 mr-1" /> Criar run
          </Button>
        </CardContent>
      </Card>

      <Card className="border-[var(--color-border)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-4 w-4 text-[var(--color-warning)]" />
            Runs de certificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <p className="text-sm text-[var(--color-text-muted)]">Nenhum run ainda. Crie um acima.</p>
          ) : (
            <ul className="space-y-3">
              {runs.map((r) => (
                <li key={r.id} className="rounded-lg border border-[var(--color-border)] p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{LEVEL_LABELS[r.level] ?? r.level}</Badge>
                    <span className="text-sm text-[var(--color-text-muted)]">
                      {new Date(r.run_at).toLocaleString('pt-BR')}
                      {r.valid_until && ` · Válido até ${r.valid_until}`}
                    </span>
                    <a
                      href={`/api/supho/certification/dossier/${r.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-[var(--color-primary)] hover:underline"
                    >
                      <FileText className="h-4 w-4" /> Ver dossiê (PDF)
                    </a>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setExpandedRunId(expandedRunId === r.id ? null : r.id);
                        if (expandedRunId !== r.id) loadEvidences(r.id);
                      }}
                    >
                      Evidências
                    </Button>
                  </div>
                  {expandedRunId === r.id && (
                    <div className="mt-3 space-y-2 pl-4 border-l-2 border-slate-200">
                      {(evidencesByRun[r.id] ?? []).map((e) => {
                        const c = criteria.find((x) => x.id === e.criterion_id);
                        return (
                          <div key={e.id} className="text-sm">
                            <span className="font-medium">{c?.criterion_text ?? e.criterion_id}</span>
                            {' '}
                            — Pontuação: {e.score}
                            {e.evidence_url && (
                              <a href={e.evidence_url} target="_blank" rel="noopener noreferrer" className="ml-2 text-indigo-600">
                                <ExternalLink className="inline h-3 w-3" />
                              </a>
                            )}
                          </div>
                        );
                      })}
                      {evidenceForm?.runId === r.id ? (
                        <div className="flex flex-wrap gap-2">
                          <select
                            className="h-9 rounded border px-2 text-sm"
                            value={evidenceForm.criterion_id}
                            onChange={(e) => setEvidenceForm((f) => f && { ...f, criterion_id: e.target.value })}
                          >
                            <option value="">Critério</option>
                            {criteria.map((c) => (
                              <option key={c.id} value={c.id}>{c.dimension}: {c.criterion_text}</option>
                            ))}
                          </select>
                          <Input
                            type="number"
                            min={0}
                            max={3}
                            value={evidenceForm.score}
                            onChange={(e) => setEvidenceForm((f) => f && { ...f, score: parseInt(e.target.value, 10) || 0 })}
                            className="w-16"
                          />
                          <Input
                            placeholder="URL evidência"
                            value={evidenceForm.evidence_url}
                            onChange={(e) => setEvidenceForm((f) => f && { ...f, evidence_url: e.target.value })}
                            className="w-48"
                          />
                          <Button size="sm" onClick={handleSaveEvidence}>Salvar</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEvidenceForm(null)}>Cancelar</Button>
                        </div>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => setEvidenceForm({ runId: r.id, criterion_id: criteria[0]?.id ?? '', score: 0, evidence_url: '', notes: '' })}>
                          <Plus className="h-3 w-3 mr-1" /> Adicionar evidência
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
    </div>
  );
}
