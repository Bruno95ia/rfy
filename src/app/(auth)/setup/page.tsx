'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/ui/Logo';

const ENV_CLOUD = `NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=seu-anon-key
SUPABASE_SERVICE_ROLE_KEY=seu-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres
AI_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/postgres`;

const ENV_LOCAL = `# Após rodar: npx supabase start && npx supabase status
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<copie do "anon key" do status>
SUPABASE_SERVICE_ROLE_KEY=<copie do "service_role key" do status>
NEXT_PUBLIC_APP_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
AI_DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres`;

export default function SetupPage() {
  const [copied, setCopied] = useState(false);

  const [envMode, setEnvMode] = useState<'local' | 'cloud'>('local');
  const copyEnv = () => {
    navigator.clipboard.writeText(envMode === 'local' ? ENV_LOCAL : ENV_CLOUD);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <div className="mb-12 flex flex-col items-center text-center">
          <Logo variant="primary" size={56} className="mb-4" />
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">Revenue Engine</h1>
          <p className="mt-2 text-slate-500">Ative seu workspace em menos de 10 minutos</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
              Setup guiado
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Produção-ready
            </span>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-50">
                <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-semibold text-slate-900">Configuração do Supabase</h2>
                <p className="mt-2 leading-relaxed text-slate-600">
                  Siga os passos abaixo para deixar o sistema funcional e pronto para escalar como SaaS.
                </p>

                <div className="mt-4 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEnvMode('local')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${envMode === 'local' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Supabase local (recomendado)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEnvMode('cloud')}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium ${envMode === 'cloud' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                  >
                    Supabase Cloud
                  </button>
                </div>

                {envMode === 'local' ? (
                  <>
                    <ol className="mt-6 space-y-4">
                      <li className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">1</span>
                        <div>
                          <span className="font-medium text-slate-900">No terminal:</span> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-indigo-700 text-sm">npx supabase start</code>
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">2</span>
                        <div>
                          <span className="font-medium text-slate-900">Rode</span> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-indigo-700 text-sm">npx supabase status</code> e copie API URL, anon key e service_role key
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">3</span>
                        <div>
                          <span className="font-medium text-slate-900">Crie ou edite</span> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-indigo-700 text-sm">.env.local</code> com os valores abaixo (substitua as chaves pelas do status)
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">4</span>
                        <div>
                          <span className="font-medium text-slate-900">Rode</span> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-indigo-700 text-sm">npm run supabase:local</code> para aplicar migrations e criar usuário demo (admin@demo.rfy.local / Adminrv)
                        </div>
                      </li>
                    </ol>
                    <p className="mt-2 text-sm text-slate-500">Reinicie o servidor (<code className="rounded bg-slate-100 px-1 py-0.5">npm run dev</code>) após alterar o .env.local.</p>
                  </>
                ) : (
                  <>
                    <ol className="mt-6 space-y-4">
                      <li className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">1</span>
                        <div>
                          <span className="font-medium text-slate-900">Crie um projeto</span> em{' '}
                          <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:underline">supabase.com</a>
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">2</span>
                        <div>
                          <span className="font-medium text-slate-900">Execute o schema</span> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-indigo-700 text-sm">supabase/sql/schema.sql</code> no SQL Editor
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">3</span>
                        <div>
                          <span className="font-medium text-slate-900">Crie o bucket</span> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-indigo-700 text-sm">uploads</code> em Storage
                        </div>
                      </li>
                      <li className="flex gap-4">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">4</span>
                        <div>
                          <span className="font-medium text-slate-900">Crie</span> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-indigo-700 text-sm">.env.local</code> com as variáveis do projeto
                        </div>
                      </li>
                    </ol>
                  </>
                )}

                <div className="relative mt-6">
                  <pre className="overflow-x-auto rounded-xl bg-slate-100 p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {envMode === 'local' ? ENV_LOCAL : ENV_CLOUD}
                  </pre>
                  <button
                    onClick={copyEnv}
                    className="absolute right-3 top-3 rounded-lg bg-white border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                  >
                    {copied ? 'Copiado!' : 'Copiar'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
              Checklist final de ativação
            </h3>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                1. Variáveis `.env.local` configuradas
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                2. Schema e migrations aplicados
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                3. Bucket `uploads` criado
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                4. Login criado para o primeiro admin
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/login"
              className="w-full rounded-xl bg-indigo-600 px-6 py-3 text-center font-medium text-white transition hover:bg-indigo-700 sm:w-auto"
            >
              Já configurei — Ir para login
            </Link>
            <Link
              href="/signup"
              className="w-full rounded-xl border border-slate-200 bg-white px-6 py-3 text-center font-medium text-slate-700 transition hover:bg-slate-50 sm:w-auto"
            >
              Criar conta
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
