'use client';

import { useState, useEffect, useCallback } from 'react';
import { trackScreen } from '@/lib/analytics/track';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, Plus, Users, Calculator, ArrowRight, Loader2, Send } from 'lucide-react';

type Campaign = { id: string; name: string; status: string; created_at: string };
type Question = { id: string; block: string; internal_weight: number; question_text: string | null; item_code: string | null; sort_order: number };

interface DiagnosticoClientProps {
  orgId: string;
  initialCampaigns: Campaign[];
}

export function DiagnosticoClient({ orgId, initialCampaigns }: DiagnosticoClientProps) {
  const router = useRouter();
  const [campaigns, setCampaigns] = useState<Campaign[]>(initialCampaigns);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [respondentsCount, setRespondentsCount] = useState<Record<string, number>>({});
  const [newCampaignName, setNewCampaignName] = useState('');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [questionsError, setQuestionsError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [computing, setComputing] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<string | null>(null);

  const fetchCampaigns = useCallback(async () => {
    const res = await fetch('/api/supho/campaigns');
    if (res.ok) {
      const data = await res.json();
      setCampaigns(data);
    }
  }, []);

  const fetchQuestions = useCallback(async () => {
    setQuestionsError(null);
    try {
      const r = await fetch('/api/supho/questions');
      const data = await r.json();
      if (!r.ok) throw new Error((data as { error?: string })?.error || 'Erro ao carregar perguntas');
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) {
      setQuestionsError(e instanceof Error ? e.message : 'Erro ao carregar perguntas');
      setQuestions([]);
    }
  }, []);

  const fetchRespondentsCount = useCallback(async (campaignId: string) => {
    try {
      const r = await fetch(`/api/supho/respondents?campaign_id=${campaignId}`);
      const data = await r.json();
      const count = Array.isArray(data) ? data.length : (data?.count ?? 0);
      setRespondentsCount((prev) => ({ ...prev, [campaignId]: count }));
    } catch {
      // mantém contagem anterior; não bloqueia a tela
    }
  }, []);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  useEffect(() => {
    if (!selectedCampaignId) return;
    fetchRespondentsCount(selectedCampaignId);
  }, [selectedCampaignId, fetchRespondentsCount]);

  useEffect(() => {
    trackScreen('supho_diagnostico');
  }, []);

  const createCampaign = async () => {
    const name = newCampaignName.trim() || 'Nova campanha';
    setCreating(true);
    setError(null);
    try {
      const res = await fetch('/api/supho/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status: 'open' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao criar campanha');
      setCampaigns((prev) => [data, ...prev]);
      setSelectedCampaignId(data.id);
      setNewCampaignName('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setCreating(false);
    }
  };

  const addRespondent = async () => {
    if (!selectedCampaignId || questions.length === 0) return;
    const filled = questions.every((q) => {
      const v = answers[q.id];
      return typeof v === 'number' && v >= 1 && v <= 5;
    });
    if (!filled) {
      setError('Preencha todas as perguntas (1 a 5).');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const resResp = await fetch('/api/supho/respondents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaignId }),
      });
      const respondent = await resResp.json();
      if (!resResp.ok) throw new Error(respondent?.error || 'Erro ao criar respondente');

      const resAnswers = await fetch('/api/supho/answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          respondent_id: respondent.id,
          answers: questions.map((q) => ({ question_id: q.id, value: answers[q.id] ?? 3 })),
        }),
      });
      const ansData = await resAnswers.json();
      if (!resAnswers.ok) throw new Error(ansData?.error || 'Erro ao salvar respostas');

      setAnswers({});
      setRespondentsCount((prev) => ({ ...prev, [selectedCampaignId]: (prev[selectedCampaignId] ?? 0) + 1 }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  const computeResult = async () => {
    if (!selectedCampaignId) return;
    setComputing(true);
    setError(null);
    try {
      const res = await fetch('/api/supho/diagnostic/compute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campaign_id: selectedCampaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Erro ao calcular');
      router.push('/app/supho/maturidade');
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setComputing(false);
    }
  };

  const sendInvites = async () => {
    if (!selectedCampaignId) {
      setError('Selecione uma campanha antes de disparar convites.');
      return;
    }
    const lines = inviteEmails
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setError('Adicione ao menos um email (formato: Nome <email@dominio>).');
      return;
    }
    const respondents = lines.map((line) => {
      const m = line.match(/^(.*)<([^>]+)>$/);
      if (m) {
        return { name: m[1].trim(), email: m[2].trim() };
      }
      return { name: '', email: line };
    });
    setInviting(true);
    setError(null);
    setInviteResult(null);
    try {
      const res = await fetch('/api/forms/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          form_slug: `supho-${selectedCampaignId}`,
          form_name: `Diagnóstico SUPHO - ${campaigns.find((c) => c.id === selectedCampaignId)?.name ?? 'Campanha'}`,
          respondents,
        }),
      });
      const data = await res.json();
      if (!res.ok && res.status !== 207) {
        throw new Error(data?.error || 'Erro ao disparar convites');
      }
      const failed = Array.isArray(data.failed) ? data.failed.length : 0;
      const success = typeof data.success === 'number' ? data.success : respondents.length - failed;
      setInviteResult(`Convites enviados: ${success}. Falhas: ${failed}.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setInviting(false);
    }
  };

  const count = selectedCampaignId ? (respondentsCount[selectedCampaignId] ?? 0) : 0;

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {error}
        </div>
      )}

      {questionsError && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
          <span>{questionsError}</span>
          <Button variant="outline" size="sm" onClick={() => fetchQuestions()}>
            Tentar novamente
          </Button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4" />
              Campanhas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Nome da nova campanha"
                value={newCampaignName}
                onChange={(e) => setNewCampaignName(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
              <Button onClick={createCampaign} disabled={creating} size="sm">
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Nova
              </Button>
            </div>
            <ul className="space-y-2">
              {campaigns.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedCampaignId(c.id)}
                    className={`w-full rounded-lg border px-3 py-2 text-left text-sm transition ${
                      selectedCampaignId === c.id
                        ? 'border-indigo-500 bg-indigo-50'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="default" className="ml-2 text-xs">
                      {c.status}
                    </Badge>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              Respondentes e respostas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!selectedCampaignId ? (
              <p className="text-sm text-slate-500">Selecione uma campanha ao lado.</p>
            ) : (
              <>
                <p className="text-sm text-slate-600">
                  <strong>{count}</strong> respondente(s). Adicione ao menos um com todas as perguntas respondidas (1–5) para calcular o resultado.
                </p>
                {questions.length === 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm text-amber-600">
                      {questionsError
                        ? 'Não foi possível carregar as perguntas.'
                        : 'Nenhuma pergunta carregada. Execute a migração 008 (perguntas padrão) ou adicione perguntas na organização.'}
                    </p>
                    {questionsError && (
                      <Button variant="outline" size="sm" onClick={() => fetchQuestions()}>
                        Tentar novamente
                      </Button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="max-h-[280px] space-y-3 overflow-y-auto rounded border border-slate-100 bg-slate-50/50 p-3">
                      {questions.map((q) => (
                        <div key={q.id} className="flex flex-wrap items-center gap-2 text-sm">
                          <span className="w-6 rounded bg-slate-200 px-1 text-center text-xs font-medium text-slate-600">
                            {q.block}
                          </span>
                          <label className="min-w-0 flex-1 text-slate-700">
                            {q.question_text || q.id.slice(0, 8)}
                          </label>
                          <select
                            value={answers[q.id] ?? ''}
                            onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))}
                            className="rounded border border-slate-200 bg-white px-2 py-1 text-sm"
                          >
                            <option value="">—</option>
                            {[1, 2, 3, 4, 5].map((n) => (
                              <option key={n} value={n}>
                                {n}
                              </option>
                            ))}
                          </select>
                        </div>
                      ))}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button onClick={addRespondent} disabled={loading} size="sm">
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Adicionar respondente
                      </Button>
                      <Button
                        onClick={computeResult}
                        disabled={computing || count === 0}
                        variant="default"
                        size="sm"
                      >
                        {computing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
                        Calcular resultado
                      </Button>
                      <Link href="/app/supho/maturidade">
                        <Button variant="outline" size="sm">
                          Ver Painel de Maturidade
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Button>
                      </Link>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={sendInvites}
                        disabled={inviting}
                      >
                        {inviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                        Disparar convites por e-mail
                      </Button>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-medium text-slate-600">
                        Lista de emails (um por linha, opcionalmente no formato Nome &lt;email@dominio&gt;)
                      </label>
                      <textarea
                        value={inviteEmails}
                        onChange={(e) => setInviteEmails(e.target.value)}
                        rows={4}
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                        placeholder={'Exemplos:\nMaria Silva <maria@empresa.com>\njoao@empresa.com'}
                      />
                      {inviteResult && (
                        <p className="text-xs text-emerald-700">{inviteResult}</p>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
