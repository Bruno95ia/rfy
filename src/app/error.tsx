'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-slate-50 px-4">
      <div className="flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-white p-8 text-center shadow-sm">
        <div className="rounded-full bg-red-100 p-3">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-slate-900">
          Algo deu errado
        </h2>
        <p className="max-w-md text-sm text-slate-600">
          Ocorreu um erro inesperado. Tente novamente ou acesse a página inicial.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
          <Button onClick={reset} variant="default" size="sm">
            <RefreshCw className="mr-2 h-4 w-4" />
            Tentar novamente
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/">Página inicial</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
