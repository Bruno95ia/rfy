'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Database, FileSpreadsheet, ListChecks } from 'lucide-react';
import { UploadDropzone } from '@/components/UploadDropzone';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

type Kind = 'opportunities' | 'activities';

interface UploadFormProps {
  orgId: string;
}

export function UploadForm({ orgId }: UploadFormProps) {
  const [kind, setKind] = useState<Kind>('opportunities');
  const router = useRouter();
  const { toast } = useToast();

  async function handleUpload(file: File, uploadKind: Kind) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', uploadKind);
    formData.append('orgId', orgId);

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? 'Erro no upload');
    }
    toast({
      title: 'Upload realizado',
      description: `Arquivo "${file.name}" enviado com sucesso. Processando...`,
      variant: 'success',
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/60 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-900">
            1. Selecione o tipo de arquivo
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Oportunidades alimenta pipeline. Atividades melhora análise de risco por estagnação.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="primary" className="gap-1.5">
            <Database className="h-3.5 w-3.5" />
            PipeRun CSV
          </Badge>
          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as Kind)}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 transition focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 sm:w-auto sm:min-w-[190px]"
          >
            <option value="opportunities">Oportunidades</option>
            <option value="activities">Atividades</option>
          </select>
        </div>
      </div>

      <div className="grid gap-3 text-xs text-slate-500 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <FileSpreadsheet className="h-4 w-4 text-indigo-500" />
          CSV separado por vírgula
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <ListChecks className="h-4 w-4 text-indigo-500" />
          Campos originais preservados
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
          <Database className="h-4 w-4 text-indigo-500" />
          Máximo 50 MB por arquivo
        </div>
      </div>

      <UploadDropzone kind={kind} onUpload={handleUpload} />
    </div>
  );
}
