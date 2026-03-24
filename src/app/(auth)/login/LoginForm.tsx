'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Undo2 } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function LoginForm() {
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
      const res = await fetch(`/api/auth/login?next=${encodeURIComponent(next)}`, {
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
      setError(data.error ?? 'Erro ao fazer login');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="w-full">
      <Card className="w-full border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-md)]">
        <CardHeader className="space-y-2 pb-4 text-center sm:text-left">
          <div className="mx-auto sm:mx-0 lg:hidden">
            <Logo variant="primary" size={38} />
          </div>
          <CardTitle className="text-2xl">Entrar no RFY</CardTitle>
          <p className="text-sm text-[var(--color-text-muted)]">
            Acesse o dashboard para acompanhar Receita Confiável e decisões prioritárias.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
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
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password">Senha</Label>
                <Link
                  href="#"
                  className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
                >
                  Recuperar senha
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div
                className="rounded-[var(--radius-md)] border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] px-3 py-2 text-sm text-[var(--color-danger-foreground)] space-y-2"
                role="alert"
              >
                <p>{error}</p>
                {(error.includes('configuração') || error.includes('conectar')) && (
                  <Link href="/setup" className="inline-flex font-medium underline hover:no-underline">
                    Ver instruções de configuração →
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" disabled={loading} className="h-11 w-full">
              {loading ? 'Entrando...' : 'Entrar'}
              {!loading && <ArrowRight className="h-4 w-4" aria-hidden />}
            </Button>
          </form>

          <div className="space-y-3 border-t border-[var(--color-border)] pt-4 text-center">
            <p className="text-sm text-[var(--color-text-muted)]">
              Não tem conta?{' '}
              <Link
                href={inviteToken ? `/signup?invite=${encodeURIComponent(inviteToken)}` : '/signup'}
                className="font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
              >
                Criar conta
              </Link>
            </p>
            {inviteToken && (
              <p className="text-xs text-[var(--color-text-muted)]">
                Após entrar ou criar conta, seu convite será aceito automaticamente.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                setEmail('admin@demo.rfy.local');
                setPassword('Adminrv');
                setError(null);
              }}
              className="text-xs font-medium text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
            >
              Usar credenciais demo
            </button>
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
          <Link href="/termos" className="hover:underline">
            Termos de Uso
          </Link>
          {' · '}
          <Link href="/privacidade" className="hover:underline">
            Privacidade
          </Link>
          {' · '}
          <Link href="/precos" className="hover:underline">
            Planos
          </Link>
        </footer>
      </Card>
    </section>
  );
}
