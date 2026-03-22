'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Gauge } from 'lucide-react';

type UsagePayload = {
  usage?: { uploads_30d?: number };
  saas?: { limits?: { uploads_limit_30d?: number } };
};

/**
 * Mostra uso de uploads (30d) vs limite do plano antes de ações de ingestão.
 */
export function UsageLimitsHint() {
  const [usage, setUsage] = useState<{ current: number; limit: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/settings', { credentials: 'include' });
        const d = (await res.json()) as UsagePayload;
        if (cancelled || !res.ok) return;
        const current = d.usage?.uploads_30d ?? 0;
        const limit = d.saas?.limits?.uploads_limit_30d ?? 120;
        setUsage({ current, limit });
      } catch {
        if (!cancelled) setUsage(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !usage) return null;

  const { current, limit } = usage;
  const safeLimit = Math.max(1, limit);
  const pct = Math.min(100, (current / safeLimit) * 100);
  const atOrOver = current >= limit;
  const near = !atOrOver && pct >= 85;

  return (
    <div
      className={`rounded-xl border px-4 py-3 text-sm ${
        atOrOver
          ? 'border-red-200 bg-red-50 text-red-950'
          : near
            ? 'border-amber-200 bg-amber-50 text-amber-950'
            : 'border-slate-200 bg-slate-50 text-slate-800'
      }`}
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2">
        {atOrOver ? (
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        ) : (
          <Gauge className="h-4 w-4 shrink-0 text-slate-600" aria-hidden />
        )}
        <span className="font-medium">
          Uploads nos últimos 30 dias: {current} / {limit}
        </span>
      </div>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white/80">
        <div
          className={`h-full rounded-full transition-all ${
            atOrOver ? 'bg-red-500' : near ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {atOrOver && (
        <p className="mt-2 text-xs">
          Limite do plano atingido. Ajuste o plano em Configurações ou aguarde a janela de 30 dias. Novos uploads serão
          recusados até haver capacidade.
        </p>
      )}
      {near && !atOrOver && (
        <p className="mt-2 text-xs text-amber-900/90">Próximo do limite de uploads do plano.</p>
      )}
    </div>
  );
}

/**
 * @param uploadCost — unidades de upload_30d que a ação consome (ex.: pacote demo = 2).
 */
export function useUploadLimitGate(uploadCost: number = 1): {
  blocked: boolean;
  loading: boolean;
  refresh: () => void;
} {
  const [blocked, setBlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/settings', { credentials: 'include' });
        const d = (await res.json()) as UsagePayload;
        if (cancelled || !res.ok) return;
        const current = d.usage?.uploads_30d ?? 0;
        const limit = d.saas?.limits?.uploads_limit_30d ?? 120;
        const cost = Math.max(1, uploadCost);
        setBlocked(current + cost > limit);
      } catch {
        if (!cancelled) setBlocked(false);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tick, uploadCost]);

  return {
    blocked,
    loading,
    refresh: () => setTick((t) => t + 1),
  };
}
