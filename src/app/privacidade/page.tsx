export default function PrivacidadePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Política de Privacidade (LGPD)</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: fevereiro de 2025.</p>
        <div className="mt-8 space-y-6 text-sm text-slate-700">
          <p>
            O RFY trata dados pessoais em conformidade com a Lei Geral de Proteção de Dados
            (LGPD). Coletamos apenas o necessário para prestar o serviço: conta (e-mail,
            nome), dados de uso na plataforma e dados de negócio que você envia (ex.:
            oportunidades, atividades) para cálculo de métricas.
          </p>
          <p>
            Os dados são processados em servidores que podem estar no Brasil ou no exterior,
            com medidas de segurança adequadas. Não vendemos dados pessoais. Compartilhamos
            apenas quando exigido por lei ou com seu consentimento.
          </p>
          <p>
            Você pode solicitar acesso, correção ou exclusão dos seus dados entrando em
            contato conosco. Para dúvidas sobre esta política, utilize o canal de suporte
            indicado na aplicação.
          </p>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          <a href="/termos" className="text-indigo-600 hover:underline">
            Termos de Uso
          </a>
          {' · '}
          <a href="/login" className="text-indigo-600 hover:underline">
            Voltar ao login
          </a>
        </p>
      </main>
    </div>
  );
}
