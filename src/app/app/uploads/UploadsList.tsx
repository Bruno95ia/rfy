'use client';

import { useState } from 'react';
import {
  CheckCircle,
  AlertCircle,
  Loader2,
  Upload,
  RefreshCw,
  FileText,
  Clock,
  FileCheck,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/cn';

interface UploadRecord {
  id: string;
  filename: string;
  kind: string;
  status: string;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
}

const statusConfig = {
  uploaded: {
    icon: Upload,
    badge: 'default' as const,
    label: 'Enviado',
  },
  processing: {
    icon: Loader2,
    badge: 'processing' as const,
    label: 'Processando',
  },
  done: {
    icon: CheckCircle,
    badge: 'success' as const,
    label: 'Concluído',
  },
  failed: {
    icon: AlertCircle,
    badge: 'danger' as const,
    label: 'Falhou',
  },
};

function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status as keyof typeof statusConfig] ?? statusConfig.uploaded;
  const Icon = config.icon;

  return (
    <Badge variant={config.badge} className="gap-1.5">
      {status === 'processing' ? (
        <Icon className="h-3.5 w-3.5 shrink-0 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5 shrink-0" />
      )}
      {config.label}
    </Badge>
  );
}

function ErrorModal({
  filename,
  error,
  onClose,
}: {
  filename: string;
  error: string;
  onClose: () => void;
}) {
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Erro no upload</DialogTitle>
          <DialogDescription>{filename}</DialogDescription>
        </DialogHeader>
        <div className="rounded-[var(--radius-md)] border border-[var(--color-danger-soft)] bg-[var(--color-danger-soft)] p-4">
          <p className="whitespace-pre-wrap break-words text-sm text-[var(--color-danger-foreground)]">
            {error}
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function UploadsList({ uploads }: { uploads: UploadRecord[] }) {
  const { toast } = useToast();
  const [errorModal, setErrorModal] = useState<{ filename: string; error: string } | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'uploaded' | 'processing' | 'done' | 'failed'>('all');
  const [kindFilter, setKindFilter] = useState<'all' | 'opportunities' | 'activities'>('all');
  const [reprocessingId, setReprocessingId] = useState<string | null>(null);

  const handleReprocess = async (id: string, filename: string) => {
    setReprocessingId(id);
    try {
      const res = await fetch('/api/upload/reprocess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uploadId: id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error ?? `Erro ${res.status}`);
      }
      toast({
        title: 'Reprocessamento enfileirado',
        description: `"${filename}" será processado novamente em instantes.`,
        variant: 'default',
      });
      window.location.reload();
    } catch (err) {
      toast({
        title: 'Erro ao reprocessar',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setReprocessingId(null);
    }
  };

  const handleViewError = (filename: string, error: string | null) => {
    if (error) {
      setErrorModal({ filename, error });
    } else {
      toast({
        title: 'Sem erro',
        description: 'Não há mensagem de erro para este upload.',
        variant: 'default',
      });
    }
  };

  const sortedByDate = [...uploads].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  const filteredUploads = sortedByDate.filter((u) => {
    if (statusFilter !== 'all' && u.status !== statusFilter) return false;
    if (kindFilter !== 'all' && u.kind !== kindFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      u.filename.toLowerCase().includes(q) ||
      u.kind.toLowerCase().includes(q) ||
      u.status.toLowerCase().includes(q) ||
      (u.error_message ?? '').toLowerCase().includes(q)
    );
  });
  const doneCount = uploads.filter((u) => u.status === 'done').length;
  const processingCount = uploads.filter((u) => u.status === 'processing').length;
  const failedCount = uploads.filter((u) => u.status === 'failed').length;

  if (uploads.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-16 p-6">
          <div className="rounded-xl bg-slate-100 p-4">
            <Upload className="h-12 w-12 text-slate-400" />
          </div>
          <p className="mt-4 text-base font-medium text-slate-900">Nenhum upload ainda</p>
          <p className="mt-1 text-sm text-slate-500">
            Faça upload de um arquivo CSV acima para começar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="p-4 pb-4">
          <h2 className="text-base font-semibold text-slate-900">Histórico de uploads</h2>
          <p className="text-sm text-slate-500">
            {uploads.length} registro(s). Ordenado por data.
          </p>
          <div className="mt-4 grid gap-3 md:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por arquivo, status ou erro..."
                className="pl-9"
              />
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3">
              <SlidersHorizontal className="h-4 w-4 text-slate-400" />
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as 'all' | 'uploaded' | 'processing' | 'done' | 'failed'
                  )
                }
                className="h-10 w-full bg-transparent text-sm text-slate-700 focus:outline-none"
              >
                <option value="all">Todos os status</option>
                <option value="uploaded">Enviado</option>
                <option value="processing">Processando</option>
                <option value="done">Concluído</option>
                <option value="failed">Falhou</option>
              </select>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-3">
              <select
                value={kindFilter}
                onChange={(e) =>
                  setKindFilter(e.target.value as 'all' | 'opportunities' | 'activities')
                }
                className="h-10 w-full bg-transparent text-sm text-slate-700 focus:outline-none"
              >
                <option value="all">Todos os tipos</option>
                <option value="opportunities">Oportunidades</option>
                <option value="activities">Atividades</option>
              </select>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <Badge variant="success">{doneCount} concluídos</Badge>
            <Badge variant="processing">{processingCount} processando</Badge>
            <Badge variant={failedCount > 0 ? 'danger' : 'default'}>
              {failedCount} com erro
            </Badge>
            {(search || statusFilter !== 'all' || kindFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setStatusFilter('all');
                  setKindFilter('all');
                }}
                className="rounded-md border border-slate-200 px-2 py-1 text-slate-500 hover:bg-slate-50"
              >
                Limpar filtros
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {filteredUploads.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-slate-500">
              Nenhum upload encontrado para os filtros atuais.
            </div>
          )}
          <div className="divide-y divide-slate-200">
            {filteredUploads.map((u) => {
              const kindLabel = u.kind === 'opportunities' ? 'Oportunidades' : 'Atividades';
              return (
                <div
                  key={u.id}
                  className={cn(
                    'flex flex-col gap-4 p-4 transition sm:flex-row sm:items-center sm:justify-between',
                    'hover:bg-slate-50/80'
                  )}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-slate-900">{u.filename}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <Badge variant="default">{kindLabel}</Badge>
                        <span className="text-slate-500">·</span>
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock className="h-3.5 w-3.5" />
                          {new Date(u.created_at).toLocaleString('pt-BR')}
                        </span>
                        {u.processed_at && (
                          <>
                            <span className="text-slate-500">·</span>
                            <span className="flex items-center gap-1 text-xs text-slate-500">
                        <FileCheck className="h-3.5 w-3.5" />
                              Processado: {new Date(u.processed_at).toLocaleString('pt-BR')}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={u.status} />
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-slate-500 hover:text-slate-900"
                        onClick={() => handleReprocess(u.id, u.filename)}
                        disabled={u.status === 'processing' || reprocessingId === u.id}
                      >
                        {reprocessingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        Reprocessar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-slate-500 hover:text-slate-900"
                        onClick={() => handleViewError(u.filename, u.error_message)}
                      >
                        <AlertCircle className="h-4 w-4" />
                        Ver erro
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {errorModal && (
        <ErrorModal
          filename={errorModal.filename}
          error={errorModal.error}
          onClose={() => setErrorModal(null)}
        />
      )}
    </>
  );
}
