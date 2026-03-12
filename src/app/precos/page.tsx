import Link from 'next/link';

const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: 0,
    description: 'Para começar com RFY Index e relatórios básicos.',
    features: ['Até 8 usuários', '120 uploads/30 dias', '500 oportunidades ativas', 'Alertas por e-mail', 'Relatório semanal'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 299,
    description: 'Para times de revenue que precisam de mais integração.',
    features: ['Até 25 usuários', '800 uploads/30 dias', '5.000 oportunidades', 'Alertas (e-mail, Slack, webhook)', 'Relatórios diário e semanal', 'Integração CRM'],
  },
  {
    id: 'business',
    name: 'Business',
    price: 899,
    description: 'Para operação em escala com múltiplos canais.',
    features: ['Até 100 usuários', '5.000 uploads/30 dias', '50.000 oportunidades', 'Alertas (e-mail, Slack, WhatsApp, webhook)', 'Relatórios diário, semanal e mensal', 'API keys e integrações'],
  },
];

export default function PrecosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" className="font-semibold text-slate-900">
            RFY
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-16">
        <h1 className="text-center text-3xl font-bold text-slate-900">Planos e preços</h1>
        <p className="mt-2 text-center text-slate-600">
          Escolha o plano ideal para sua operação de receita.
        </p>
        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
              <p className="mt-1 text-2xl font-bold text-slate-900">
                {plan.price === 0 ? 'Grátis' : `R$ ${plan.price}/mês`}
              </p>
              <p className="mt-2 text-sm text-slate-600">{plan.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                {plan.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <Link
                href={plan.price === 0 ? '/signup' : '/login'}
                className="mt-6 block w-full rounded-lg bg-indigo-600 py-2 text-center text-sm font-medium text-white hover:bg-indigo-700"
              >
                {plan.price === 0 ? 'Criar conta' : 'Falar com vendas'}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-8 text-center text-sm text-slate-500">
          Cobrança em configuração. Entre em contato para assinatura Pro ou Business.
        </p>
      </main>
    </div>
  );
}
