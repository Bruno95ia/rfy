'use client';

import { useState, useEffect } from 'react';
import { Cpu, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { getAIStatus, triggerTrain, type AIStatusResponse, type TrainResponse } from '@/lib/aiClient';
import { cn } from '@/lib/cn';

export interface AIStatusCardProps {
  orgId: string | null;
  onTrainComplete?: (result: TrainResponse) => void;
  onTrainError?: (err: string) => void;
  className?: string;
}

export function AIStatusCard({
  orgId,
  onTrainComplete,
  onTrainError,
  className,
}: AIStatusCardProps) {
  const [status, setStatus] = useState<AIStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [trainLoading, setTrainLoading] = useState(false);

  const loadStatus = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const data = await getAIStatus(orgId);
      setStatus(data);
    } catch {
      setStatus({
        health: 'unavailable',
        models: [],
        models_available: false,
        error: 'Não foi possível conectar ao serviço de IA',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, [orgId]);

  const handleTrain = async () => {
    if (!orgId) return;
    setTrainLoading(true);
    onTrainError?.(undefined as unknown as string);
    try {
      const result = await triggerTrain(orgId);
      onTrainComplete?.(result);
      await loadStatus();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      onTrainError?.(msg);
    } finally {
      setTrainLoading(false);
    }
  };

  if (!orgId) return null;

  const healthy = status?.health === 'ok';
  const hasModels = status?.models_available && Array.isArray(status?.models) && status.models.length > 0;
  const lastModel = hasModels ? status!.models[0] : null;

  return (
    <div
      className={cn(
        'rounded-2xl border border-slate-200 bg-white p-6 shadow-sm',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50">
          <Cpu className="h-5 w-5 text-indigo-600" aria-hidden />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Status da IA</h2>
          <p className="text-sm text-slate-500">
            Serviço de previsão, benchmark e intervenções
          </p>
        </div>
      </div>

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando status…
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            {healthy ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-sm font-medium text-emerald-800">
                <CheckCircle2 className="h-4 w-4" />
                Serviço ativo
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-sm font-medium text-amber-800">
                <AlertCircle className="h-4 w-4" />
                Análise AI indisponível
                {status?.error ? ` — ${status.error}` : ''}
              </span>
            )}
            {lastModel && (
              <span className="text-sm text-slate-600">
                Modelo: <strong>{lastModel.model_name}</strong> v{lastModel.version}
                {lastModel.trained_at && (
                  <span className="text-slate-400"> · {new Date(lastModel.trained_at).toLocaleDateString('pt-BR')}</span>
                )}
              </span>
            )}
            {!hasModels && healthy && (
              <span className="text-sm text-slate-500">
                Nenhum modelo treinado ainda
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={loadStatus}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar status
            </button>
            <button
              type="button"
              onClick={handleTrain}
              disabled={trainLoading || !healthy}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {trainLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Cpu className="h-4 w-4" />
              )}
              Treinar modelo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
