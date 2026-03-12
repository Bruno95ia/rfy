'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Copy, Check, AlertCircle } from 'lucide-react';
import type { CopilotRevenueResponse } from '@/app/api/ai/copilot-revenue/route';

const PERSONAS = [
  { value: '', label: 'Não especificado' },
  { value: 'CFO', label: 'CFO / Financeiro' },
  { value: 'TI', label: 'TI' },
  { value: 'Operações', label: 'Operações' },
  { value: 'CEO', label: 'CEO / Dono' },
] as const;

interface CopilotContasClientProps {
  orgId: string;
  companies: string[];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Button type="button" variant="ghost" size="sm" onClick={copy} title={`Copiar ${label}`}>
      {copied ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}

export function CopilotContasClient({ orgId, companies }: CopilotContasClientProps) {
  const [accountName, setAccountName] = useState('');
  const [accountNameFree, setAccountNameFree] = useState('');
  const [persona, setPersona] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CopilotRevenueResponse | null>(null);

  const displayAccount = accountName || accountNameFree.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId || !displayAccount) {
      setError('Selecione ou digite o nome da conta.');
      return;
    }
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const res = await fetch('/api/ai/copilot-revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          org_id: orgId,
          account_name: displayAccount,
          persona: persona || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? `Erro ${res.status}`);
      }
      setResult(data as CopilotRevenueResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-[var(--color-primary)]" />
            Gerar próximos passos para uma conta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div className="grid flex-1 gap-2 sm:min-w-[200px]">
              <Label htmlFor="account">Conta (empresa)</Label>
              {companies.length > 0 ? (
                <select
                  id="account"
                  className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                  value={accountName}
                  onChange={(e) => {
                    setAccountName(e.target.value);
                    setAccountNameFree('');
                  }}
                >
                  <option value="">Selecione uma conta</option>
                  {companies.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              ) : null}
              {companies.length > 0 && (
                <p className="text-xs text-[var(--color-text-muted)]">ou digite abaixo</p>
              )}
              <Input
                placeholder="Nome da empresa (se não estiver na lista)"
                value={accountNameFree}
                onChange={(e) => {
                  setAccountNameFree(e.target.value);
                  if (e.target.value) setAccountName('');
                }}
              />
            </div>
            <div className="grid gap-2 sm:min-w-[180px]">
              <Label htmlFor="persona">Persona do decisor</Label>
              <select
                id="persona"
                className="flex h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] shadow-[var(--shadow-sm)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)]"
                value={persona}
                onChange={(e) => setPersona(e.target.value)}
              >
                {PERSONAS.map((p) => (
                  <option key={p.value || 'none'} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? 'Gerando…' : 'Gerar próximos passos'}
            </Button>
          </form>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold">Recomendações para {displayAccount}</h2>
            <Badge
              variant={
              result.confidence === 'high'
                ? 'success'
                : result.confidence === 'low'
                  ? 'warning'
                  : 'outline'
            }
              className={
                result.confidence === 'low'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200'
                  : ''
              }
            >
              Confiança: {result.confidence === 'high' ? 'Alta' : result.confidence === 'medium' ? 'Média' : 'Baixa'}
            </Badge>
          </div>

          {result.missing_data && result.missing_data.length > 0 && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  Dados que melhorariam a recomendação
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2">
                <ul className="list-inside list-disc text-sm text-[var(--color-text-muted)]">
                  {result.missing_data.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
              <CardTitle className="text-base">Próxima ação</CardTitle>
              <CopyButton text={result.next_action} label="próxima ação" />
            </CardHeader>
            <CardContent className="py-2">
              <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
                {result.next_action}
              </p>
            </CardContent>
          </Card>

          {result.message_linkedin && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                <CardTitle className="text-base">Mensagem para LinkedIn</CardTitle>
                <CopyButton text={result.message_linkedin} label="mensagem LinkedIn" />
              </CardHeader>
              <CardContent className="py-2">
                <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
                  {result.message_linkedin}
                </p>
              </CardContent>
            </Card>
          )}

          {result.message_email && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                <CardTitle className="text-base">Mensagem para e-mail</CardTitle>
                <CopyButton text={result.message_email} label="mensagem e-mail" />
              </CardHeader>
              <CardContent className="py-2">
                <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
                  {result.message_email}
                </p>
              </CardContent>
            </Card>
          )}

          {result.meeting_agenda && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                <CardTitle className="text-base">Agenda sugerida para reunião</CardTitle>
                <CopyButton
                  text={
                    Array.isArray(result.meeting_agenda)
                      ? result.meeting_agenda.join('\n')
                      : result.meeting_agenda
                  }
                  label="agenda"
                />
              </CardHeader>
              <CardContent className="py-2">
                {Array.isArray(result.meeting_agenda) ? (
                  <ul className="list-inside list-disc space-y-1 text-sm text-[var(--color-text)]">
                    {result.meeting_agenda.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="whitespace-pre-wrap text-sm text-[var(--color-text)]">
                    {result.meeting_agenda}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {result.discovery_questions && result.discovery_questions.length > 0 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 py-3">
                <CardTitle className="text-base">Perguntas de discovery</CardTitle>
                <CopyButton
                  text={result.discovery_questions.join('\n')}
                  label="perguntas"
                />
              </CardHeader>
              <CardContent className="py-2">
                <ol className="list-inside list-decimal space-y-1 text-sm text-[var(--color-text)]">
                  {result.discovery_questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {result.expansion_opportunities && result.expansion_opportunities.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Oportunidades de expansão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 py-2">
                {result.expansion_opportunities.map((opp, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-sm"
                  >
                    <Badge variant="outline" className="mb-2">
                      {opp.type === 'upsell' ? 'Upsell' : 'Cross-sell'}
                    </Badge>
                    <p className="font-medium text-[var(--color-text)]">{opp.description}</p>
                    {opp.rationale && (
                      <p className="mt-1 text-[var(--color-text-muted)]">{opp.rationale}</p>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!orgId && (
        <Card className="border-amber-200 dark:border-amber-800">
          <CardContent className="py-4">
            <p className="text-sm text-[var(--color-text-muted)]">
              Nenhuma organização encontrada. Faça login e tente novamente.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
