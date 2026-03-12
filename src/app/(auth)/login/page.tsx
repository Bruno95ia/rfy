'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, CheckCircle2, ShieldCheck, TrendingUp, Undo2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Logo } from '@/components/ui/Logo';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const inviteToken = searchParams.get('invite');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;
      const next = inviteToken
        ? `/invite/accept?token=${encodeURIComponent(inviteToken)}`
        : '/app/dashboard';
      router.push(next);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao fazer login';
      const isConfig = msg.includes('Variável de ambiente ausente') || msg.includes('NEXT_PUBLIC_SUPABASE');
      const isNetwork = msg.includes('fetch') || msg.includes('Failed to fetch') || msg.includes('Network') || msg.includes('ECONNREFUSED');
      if (isConfig) {
        setError('Supabase não configurado. Acesse /setup e siga as instruções (Supabase local ou Cloud). Reinicie o servidor após editar .env.local.');
      } else if (isNetwork) {
        setError('Não foi possível conectar ao Supabase. Se estiver em dev local: rode "npx supabase start", copie as variáveis de "npx supabase status" para .env.local e reinicie o servidor.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-6xl items-stretch gap-6 lg:grid-cols-2">
        <section className="hidden rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[linear-gradient(150deg,var(--color-primary)_0%,#2f3a72_52%,#0f172a_100%)] p-10 text-[var(--color-primary-foreground)] shadow-[var(--shadow-lg)] lg:flex lg:flex-col lg:justify-between">
          <div>
            <Logo variant="white" size={40} />
            <h1 className="mt-10 text-3xl font-semibold tracking-tight">Receita (RFY)</h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-white/82">
              Governança executiva para reduzir Distorção e priorizar decisões que aumentam Receita Confiável.
            </p>
            <div className="mt-6 inline-flex">
              <Badge className="border-white/25 bg-white/10 text-white">Plataforma SaaS RFY</Badge>
            </div>
            <ul className="mt-8 space-y-3 text-sm text-white/90">
              {[
                { icon: TrendingUp, label: 'RFY Index em destaque na primeira dobra' },
                { icon: ShieldCheck, label: 'Alertas de Receita Inflada e governança contínua' },
                { icon: CheckCircle2, label: 'Integração por CSV e webhook automatizado' },
              ].map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5">
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="text-xs text-white/70">Monitoramento contínuo da qualidade da receita em 30 dias.</p>
        </section>

        <section className="flex items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] sm:p-6">
          <Card className="w-full max-w-md border-0 shadow-none">
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
                    {(error.includes('Supabase') || error.includes('npx supabase')) && (
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
                  href="/"
                  className="inline-flex items-center gap-1 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
                >
                  <Undo2 className="h-3.5 w-3.5" aria-hidden />
                  Voltar para página inicial
                </Link>
              </div>
            </CardContent>
            <footer className="border-t border-[var(--color-border)] px-6 pb-4 pt-2 text-center text-xs text-[var(--color-text-muted)]">
              <Link href="/termos" className="hover:underline">Termos de Uso</Link>
              {' · '}
              <Link href="/privacidade" className="hover:underline">Privacidade</Link>
              {' · '}
              <Link href="/precos" className="hover:underline">Planos</Link>
            </footer>
          </Card>
        </section>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center px-4">
        <div className="text-sm text-[var(--color-text-muted)]">Carregando...</div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
