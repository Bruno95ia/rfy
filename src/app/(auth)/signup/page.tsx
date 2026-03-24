'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Undo2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function SignupContent() {
  const router = useRouter();
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      setInviteToken(new URLSearchParams(window.location.search).get('invite'));
    } catch {
      setInviteToken(null);
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const next = inviteToken
        ? `/invite/accept?token=${encodeURIComponent(inviteToken)}`
        : '/app/dashboard';
      const formData = new FormData();
      formData.set('email', email);
      formData.set('password', password);
      const res = await fetch(`/api/auth/signup?next=${encodeURIComponent(next)}`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = (await res.json()) as { ok?: boolean; next?: string; error?: string };
      if (data.ok && data.next) {
        router.push(data.next);
        router.refresh();
        return;
      }
      setError(data.error ?? 'Erro ao criar conta');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen min-h-dvh w-full flex-col items-center justify-center bg-[var(--color-background)] px-4 py-10 sm:px-6">
      <div className="mx-auto grid w-full max-w-lg place-items-center">
        <Card className="w-full max-w-lg border-[var(--color-border)] shadow-[var(--shadow-lg)]">
          <CardHeader className="space-y-3 text-center">
            <div className="mx-auto">
              <Logo variant="primary" size={42} />
            </div>
            <CardTitle className="text-2xl">Criar conta no RFY</CardTitle>
            <p className="text-sm text-[var(--color-text-muted)]">
              Configure seu workspace e acompanhe Receita Confiável com visão executiva.
            </p>
            <div className="flex justify-center">
              <Badge variant="processing">Sem cartão nesta fase</Badge>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            <ul className="space-y-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-3 text-xs text-[var(--color-text-muted)]">
              {[
                'RFY Index com atualização quase em tempo real',
                'Alertas de Distorção com resolução no painel',
                'Relatório executivo para liderança',
              ].map((item) => (
                <li key={item} className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[var(--color-primary)]" aria-hidden />
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="seu@email.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              {error && (
                <div className="rounded-[var(--radius-md)] border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger-foreground)]">
                  {error}
                </div>
              )}

              <Button type="submit" disabled={loading} className="h-11 w-full">
                {loading ? 'Criando conta...' : 'Criar conta'}
                {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
              </Button>
            </form>

            <div className="space-y-3 border-t border-[var(--color-border)] pt-4 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">
                Já tem conta?{' '}
                <Link
                  href={inviteToken ? `/login?invite=${encodeURIComponent(inviteToken)}` : '/login'}
                  className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                >
                  Entrar
                </Link>
              </p>
              <Link
                href="/precos"
                className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
              >
                <Undo2 className="h-3.5 w-3.5" aria-hidden />
                Planos e preços
              </Link>
            </div>
          </CardContent>
          <footer className="border-t border-[var(--color-border)] px-6 pb-4 pt-2 text-center text-xs text-[var(--color-text-muted)]">
            Ao criar conta, você concorda com os{' '}
            <Link href="/termos" className="hover:underline">Termos de Uso</Link>
            {' e a '}
            <Link href="/privacidade" className="hover:underline">Política de Privacidade</Link>.
          </footer>
        </Card>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return <SignupContent />;
}
