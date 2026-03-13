'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    if (!token?.trim()) {
      setStatus('error');
      setMessage('Link de convite inválido ou ausente.');
      return;
    }

    const run = async () => {
      // Verifica se está logado via cookie (a API de accept exige auth)
      const checkRes = await fetch('/api/org/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
        credentials: 'include',
      });
      const data = (await checkRes.json().catch(() => ({}))) as { ok?: boolean; error?: string };

      if (checkRes.status === 401) {
        const inviteParam = encodeURIComponent(token);
        router.replace(`/login?invite=${inviteParam}`);
        return;
      }

      if (checkRes.ok && data.ok) {
        setStatus('success');
        setMessage('Você entrou na organização com sucesso.');
        router.refresh();
        setTimeout(() => router.replace('/app/dashboard'), 1500);
        return;
      }
      setStatus('error');
      setMessage(data.error ?? 'Não foi possível aceitar o convite.');
    };

    void run();
  }, [token, router]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-8">
      <Card className="w-full max-w-md border-[var(--color-border)] shadow-[var(--shadow-lg)]">
        <CardHeader className="text-center">
          <div className="mx-auto">
            <Logo variant="primary" size={40} />
          </div>
          <CardTitle className="text-xl">Convite para organização</CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">
            {status === 'loading' && 'Aceitando convite...'}
            {status === 'success' && 'Redirecionando para o dashboard.'}
            {status === 'error' && 'Algo deu errado.'}
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          {status === 'loading' && (
            <Loader2 className="h-10 w-10 animate-spin text-[var(--color-primary)]" aria-hidden />
          )}
          {status === 'success' && (
            <CheckCircle2 className="h-10 w-10 text-green-600" aria-hidden />
          )}
          {status === 'error' && (
            <>
              <AlertCircle className="h-10 w-10 text-amber-600" aria-hidden />
              <p className="text-center text-sm text-[var(--color-text-muted)]">{message}</p>
              <Button
                variant="outline"
                onClick={() => router.replace('/app/dashboard')}
              >
                Ir para o dashboard
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

export default function InviteAcceptPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-sm text-[var(--color-text-muted)]">Carregando...</div>
      </main>
    }>
      <InviteAcceptContent />
    </Suspense>
  );
}
