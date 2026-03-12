export default function TermosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-2xl font-bold text-slate-900">Termos de Uso</h1>
        <p className="mt-2 text-sm text-slate-500">Última atualização: fevereiro de 2025.</p>
        <div className="mt-8 space-y-6 text-sm text-slate-700">
          <p>
            Ao utilizar o serviço RFY (Receita Confiável), você concorda com estes termos. O
            produto está em evolução; funcionalidades e limites podem ser alterados com aviso
            prévio quando aplicável.
          </p>
          <p>
            Você é responsável pelos dados que envia ao sistema e deve garantir que possui
            direito de uso e que o uso está em conformidade com a legislação aplicável,
            incluindo a LGPD.
          </p>
          <p>
            O serviço é oferecido &quot;como está&quot;. Consulte a Política de Privacidade para
            tratamento de dados pessoais.
          </p>
        </div>
        <p className="mt-8 text-sm text-slate-500">
          <a href="/privacidade" className="text-indigo-600 hover:underline">
            Política de Privacidade
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
