import { CheckCircle2, ShieldCheck, TrendingUp } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/badge';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
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

        <LoginForm />
      </div>
    </main>
  );
}
