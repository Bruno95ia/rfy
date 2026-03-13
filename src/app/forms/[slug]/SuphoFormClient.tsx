'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Question = {
  id: string;
  block: string | null;
  internal_weight: number | null;
  question_text: string | null;
  item_code: string | null;
  sort_order: number | null;
};

interface SuphoFormClientProps {
  slug: string;
}

export function SuphoFormClient({ slug }: SuphoFormClientProps) {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [respondentName, setRespondentName] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ token, slug });
        const res = await fetch(`/api/forms/supho/info?${params.toString()}`);
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Erro ao carregar formulário');
        }
        if (cancelled) return;
        setQuestions(Array.isArray(data.questions) ? data.questions : []);
        setRespondentName(data.respondentName ?? null);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Erro ao carregar formulário');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (token) {
      load();
    } else {
      setError('Link inválido: token ausente');
      setLoading(false);
    }
    return () => {
      cancelled = true;
    };
  }, [token, slug]);

  const handleSubmit = async () => {
    if (!token) return;
    const allAnswered = questions.every((q) => {
      const v = answers[q.id];
      return typeof v === 'number' && v >= 1 && v <= 5;
    });
    if (!allAnswered) {
      setError('Responda todas as perguntas com uma nota de 1 a 5.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/forms/supho/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          slug,
          answers: questions.map((q) => ({ question_id: q.id, value: answers[q.id] ?? 3 })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Erro ao enviar respostas');
      }
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao enviar respostas');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Carregando formulário...
      </div>
    );
  }

  if (error && !questions.length) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md border-red-100 bg-white">
          <CardHeader>
            <CardTitle className="text-base text-red-700">Não foi possível abrir o formulário</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-md border-emerald-100 bg-white">
          <CardHeader>
            <CardTitle className="text-base text-emerald-700">Obrigado por responder</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-slate-600">
              Suas respostas foram registradas. Elas ajudam a compor o diagnóstico de maturidade organizacional.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <Card className="border-slate-200 bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">
              Diagnóstico SUPHO
              {respondentName ? <span className="block text-sm font-normal text-slate-500">Para: {respondentName}</span> : null}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {error}
              </div>
            )}
            <p className="text-sm text-slate-600">
              Para cada afirmação abaixo, indique o quanto ela representa a realidade atual da sua organização, usando a escala de 1 (discordo totalmente)
              a 5 (concordo totalmente).
            </p>
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <div
                  key={q.id}
                  className="flex flex-wrap items-center gap-3 rounded-md border border-slate-100 bg-slate-50/60 px-3 py-2 text-sm"
                >
                  <div className="flex-1 min-w-0">
                    <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded bg-slate-200 text-[10px] font-medium text-slate-700">
                      {idx + 1}
                    </span>
                    <span className="text-slate-800">
                      {q.question_text || q.item_code || 'Pergunta'}
                    </span>
                  </div>
                  <select
                    value={answers[q.id] ?? ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: Number(e.target.value) }))
                    }
                    className="rounded border border-slate-300 bg-white px-2 py-1 text-sm"
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
            <div className="flex justify-end">
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
              >
                {submitting ? 'Enviando...' : 'Enviar respostas'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

