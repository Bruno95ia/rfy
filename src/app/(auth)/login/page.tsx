import { CheckCircle2, ShieldCheck, TrendingUp, ClipboardList } from 'lucide-react';
import { Logo } from '@/components/ui/Logo';
import { Badge } from '@/components/ui/badge';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen min-h-dvh w-full flex-col bg-[var(--color-background)] lg:flex-row">
      {/* Painel esquerdo — desktop apenas */}
      <aside className="relative hidden w-full shrink-0 flex-col justify-between overflow-hidden border-b border-white/10 bg-[linear-gradient(150deg,var(--color-primary)_0%,#2f3a72_52%,#0f172a_100%)] px-8 py-10 text-[var(--color-primary-foreground)] shadow-[var(--shadow-lg)] lg:flex lg:w-[46%] lg:max-w-xl lg:border-b-0 lg:px-10">
        <div className="relative z-[1]">
          <Logo variant="white" size={40} />
          <h1 className="mt-8 text-3xl font-semibold tracking-tight lg:mt-10">Receita (RFY)</h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/85">
            Governança executiva para reduzir distorção e priorizar decisões que aumentam receita confiável,
            com contexto organizacional e diagnóstico SUPHO/ITSMO.
          </p>
          <div className="mt-5 inline-flex">
            <Badge className="border-white/25 bg-white/10 text-white">Plataforma SaaS RFY</Badge>
          </div>
          <ul className="mt-8 space-y-3 text-sm text-white/90">
            {[
              { icon: TrendingUp, label: 'RFY Index e painéis na primeira dobra' },
              { icon: ShieldCheck, label: 'Alertas de receita inflada e governança contínua' },
              { icon: CheckCircle2, label: 'Integração CSV, webhooks e CRM' },
              { icon: ClipboardList, label: 'Diagnóstico SUPHO e contexto da organização' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-start gap-2.5">
                <Icon className="mt-0.5 h-4 w-4 shrink-0 opacity-95" aria-hidden />
                <span>{label}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-[1] text-xs text-white/70">
          Monitoramento contínuo da qualidade da receita e da maturidade comercial.
        </p>
      </aside>

      {/* Formulário — ocupa toda a largura no mobile; centrado */}
      <main className="flex w-full flex-1 flex-col items-center justify-center px-4 py-10 sm:px-6 lg:py-12">
        <div className="w-full max-w-[440px]">
          <LoginForm />
        </div>
      </main>
    </div>
  );
}
