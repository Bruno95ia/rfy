'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from '@/components/ui/Logo';

const ENV_EXAMPLE = `# PostgreSQL (obrigatório)
DATABASE_URL=postgresql://usuario:senha@host:5432/nome_do_banco

# Opcional: mesmo banco para AI/relatórios
AI_DATABASE_URL=postgresql://usuario:senha@host:5432/nome_do_banco

# URL da aplicação (redirects e links)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Uploads: diretório no servidor para armazenar CSVs (opcional; sem isso, defina UPLOAD_DIR ou use storage externo)
# UPLOAD_DIR=/var/app/uploads

# Criptografia para secrets (api_key, webhook). Gere com: openssl rand -hex 32
ENCRYPTION_KEY=`;

export default function SetupPage() {
  const [copied, setCopied] = useState(false);

  const copyEnv = () => {
    navigator.clipboard.writeText(ENV_EXAMPLE);
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
              PostgreSQL
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
              Sem Supabase
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
                <h2 className="text-xl font-semibold text-slate-900">Configuração do banco de dados</h2>
                <p className="mt-2 leading-relaxed text-slate-600">
                  O sistema usa apenas PostgreSQL (ex.: RDS, EC2, Docker). Defina <code className="rounded bg-slate-100 px-1 py-0.5">DATABASE_URL</code> e aplique as migrations.
                </p>

                <ol className="mt-6 space-y-4">
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">1</span>
                    <div>
                      <span className="font-medium text-slate-900">Crie ou edite</span> <code className="rounded bg-slate-100 px-1.5 py-0.5 text-indigo-700 text-sm">.env.local</code> com as variáveis abaixo.
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">2</span>
                    <div>
                      <span className="font-medium text-slate-900">Aplique as migrations</span> no PostgreSQL (<code className="rounded bg-slate-100 px-1 py-0.5">npm run db:migrate</code> ou execute os SQL em <code className="rounded bg-slate-100 px-1 py-0.5">supabase/sql/</code>).
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">3</span>
                    <div>
                      <span className="font-medium text-slate-900">Opcional:</span> defina <code className="rounded bg-slate-100 px-1 py-0.5">UPLOAD_DIR</code> para salvar CSVs em disco (ex.: <code className="rounded bg-slate-100 px-1 py-0.5">/var/app/uploads</code>).
                    </div>
                  </li>
                  <li className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-sm font-bold text-indigo-600">4</span>
                    <div>
                      <span className="font-medium text-slate-900">Reinicie o servidor</span> (<code className="rounded bg-slate-100 px-1 py-0.5">npm run dev</code> ou <code className="rounded bg-slate-100 px-1 py-0.5">npm run start</code>) após alterar o .env.
                    </div>
                  </li>
                </ol>

                <div className="relative mt-6">
                  <pre className="overflow-x-auto rounded-xl bg-slate-100 p-5 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                    {ENV_EXAMPLE}
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
              Checklist final
            </h3>
            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                1. <code className="text-indigo-700">DATABASE_URL</code> configurado
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                2. Migrations aplicadas no PostgreSQL
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                3. (Opcional) <code className="text-indigo-700">UPLOAD_DIR</code> para uploads
              </p>
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
                4. Criar conta em /signup ou usar seed demo
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
