'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Package,
  Download,
  Upload,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';

interface DemoPackFormProps {
  orgId: string;
}

export function DemoPackForm({ orgId }: DemoPackFormProps) {
  const [fileOpp, setFileOpp] = useState<File | null>(null);
  const [fileAct, setFileAct] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const MAX_MB = 50;
  const maxBytes = MAX_MB * 1024 * 1024;

  const canSubmit = fileOpp && fileAct && !loading;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('oportunidades', fileOpp);
      formData.append('atividades', fileAct);
      formData.append('orgId', orgId);

      const res = await fetch('/api/demo/upload-pack', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error ?? 'Erro ao enviar demonstração');
      }

      toast({
        title: 'Demonstração enviada',
        description:
          'Oportunidades e atividades estão sendo processados. Em alguns segundos o dashboard e os relatórios serão atualizados.',
        variant: 'success',
      });
      setFileOpp(null);
      setFileAct(null);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar';
      setError(msg);
      toast({
        title: 'Erro',
        description: msg,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            Baixar planilhas modelo
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Use os CSVs no formato PipeRun. Preencha com seus dados e envie abaixo.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/demo/template/oportunidades"
            download="oportunidades_modelo.csv"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Oportunidades
          </a>
          <a
            href="/api/demo/template/atividades"
            download="atividades_modelo.csv"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Download className="h-4 w-4" />
            Atividades
          </a>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-sm font-medium text-slate-700">
              CSV de Oportunidades
            </span>
            <input
              type="file"
              accept=".csv,text/csv,application/csv,text/plain"
              className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
              onChange={(e) => setFileOpp(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
            {fileOpp && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {fileOpp.name} ({(fileOpp.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </label>
          <label className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
            <span className="text-sm font-medium text-slate-700">
              CSV de Atividades
            </span>
            <input
              type="file"
              accept=".csv,text/csv,application/csv,text/plain"
              className="text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-indigo-700"
              onChange={(e) => setFileAct(e.target.files?.[0] ?? null)}
              disabled={loading}
            />
            {fileAct && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <FileSpreadsheet className="h-3.5 w-3.5" />
                {fileAct.name} ({(fileAct.size / 1024).toFixed(1)} KB)
              </span>
            )}
          </label>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="submit"
            disabled={!canSubmit}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Processar demonstração completa
              </>
            )}
          </Button>
          <span className="text-xs text-slate-500">
            Máximo {MAX_MB} MB por arquivo. O pipeline irá processar, vincular atividades e gerar o relatório.
          </span>
        </div>
      </form>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
        <div className="flex gap-3">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-indigo-600" />
          <div className="text-sm text-indigo-900">
            <p className="font-medium">Fluxo automático</p>
            <p className="mt-1 text-indigo-700">
              Após o envio, o sistema processa as oportunidades, vincula as atividades aos deals,
              calcula fricções e gera o relatório. Em poucos segundos o Dashboard e a página de
              Relatórios estarão atualizados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
