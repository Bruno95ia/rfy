'use client';

import { useCallback, useState } from 'react';
import { FileSpreadsheet } from 'lucide-react';
import { cn } from '@/lib/cn';

const MAX_FILE_SIZE_BYTES = 50 * 1024 * 1024; // 50 MB

type Kind = 'opportunities' | 'activities';

interface UploadDropzoneProps {
  kind: Kind;
  onUpload: (file: File, kind: Kind) => Promise<void>;
  disabled?: boolean;
}

export function UploadDropzone({
  kind,
  onUpload,
  disabled = false,
}: UploadDropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length || disabled || loading) return;
      const file = files[0];
      const okExt = /\.(csv|tsv|txt|xlsx|xls)$/i.test(file.name);
      if (!okExt) {
        setError('Use CSV, TSV, TXT ou Excel (.xlsx / .xls)');
        return;
      }
      if (file.size > MAX_FILE_SIZE_BYTES) {
        setError(`Arquivo muito grande. Tamanho máximo: ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`);
        return;
      }
      setError(null);
      setLoading(true);
      try {
        await onUpload(file, kind);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erro no upload');
      } finally {
        setLoading(false);
      }
    },
    [kind, onUpload, disabled, loading]
  );

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        'flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-12 transition-all duration-200',
        isDragging && !disabled
          ? 'border-indigo-500/50 bg-indigo-50'
          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100',
        disabled && 'cursor-not-allowed opacity-50'
      )}
    >
      <label className="cursor-pointer">
        <input
          type="file"
          accept=".csv,.tsv,.txt,.xlsx,.xls,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          disabled={disabled || loading}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <div className="flex flex-col items-center gap-4 text-slate-500">
          {loading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-indigo-500/30 border-t-indigo-500" />
              <span className="text-sm">Enviando...</span>
            </div>
          ) : (
            <>
              <div className="rounded-2xl bg-indigo-50 p-4">
                <FileSpreadsheet className="h-12 w-12 text-indigo-600" />
              </div>
              <div className="text-center">
                <span className="block text-sm font-medium text-slate-900">
                  Arraste uma planilha ou clique para selecionar
                </span>
                <span className="mt-1 block text-xs text-slate-500">
                  {kind === 'opportunities'
                    ? 'Oportunidades — CSV/Excel do seu CRM (colunas reconhecidas automaticamente)'
                    : 'Atividades — CSV/Excel do seu CRM (colunas reconhecidas automaticamente)'}
                </span>
              </div>
            </>
          )}
        </div>
      </label>
      {error && (
        <div className="mt-4 rounded-lg bg-red-500/10 px-4 py-2 text-sm text-red-600">
          {error}
        </div>
      )}
    </div>
  );
}
